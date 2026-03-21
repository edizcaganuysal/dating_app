import datetime as dt
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatParticipant, ChatRoom
from app.models.group import DateGroup, GroupMember
from app.models.match import Match
from app.models.user import User
from app.services.matching_service import run_batch_matching
from tests.conftest import create_verified_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

SATURDAY = dt.date(2026, 6, 6)


async def _create_user_with_request(
    client: AsyncClient,
    db: AsyncSession,
    *,
    gender: str = "male",
    age: int = 21,
    activity: str = "karaoke",
    group_size: int = 4,
    date: dt.date = SATURDAY,
    time_window: str = "evening",
) -> tuple[str, uuid.UUID]:
    """Create a verified user with a pending date request. Returns (token, user_id)."""
    unique = uuid.uuid4().hex[:8]
    email = f"mt{unique}@utoronto.ca"
    password = "TestPassword123!"

    reg_resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "first_name": f"User{unique}",
        "last_name": "Test",
        "phone": "1234567890",
        "gender": gender,
        "age": age,
    })
    assert reg_resp.status_code == 201, reg_resp.text
    otp = reg_resp.json()["otp"]
    await client.post("/api/auth/verify-email", json={"email": email, "otp": otp})

    login_resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    token = login_resp.json()["access_token"]

    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = uuid.UUID(me_resp.json()["id"])

    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(
            age_range_min=18,
            age_range_max=30,
            interests=["music", "movies", "travel"],
            attractiveness_score=5.0,
        )
    )
    await db.commit()

    req_json = {
        "group_size": group_size,
        "activity": activity,
        "availability_slots": [{"date": date.isoformat(), "time_window": time_window}],
        "pre_group_friend_ids": [],
    }
    dr_resp = await client.post(
        "/api/date-requests",
        json=req_json,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dr_resp.status_code == 201, dr_resp.text

    return token, user_id


async def _create_matched_group(
    client: AsyncClient,
    db: AsyncSession,
) -> tuple[list[tuple[str, uuid.UUID]], DateGroup]:
    """Create 2M + 2F, run matching, return ([(token, user_id), ...], group).

    Index 0,1 = males; index 2,3 = females.
    """
    users = []
    for _ in range(2):
        token, uid = await _create_user_with_request(client, db, gender="male")
        users.append((token, uid))
    for _ in range(2):
        token, uid = await _create_user_with_request(client, db, gender="female")
        users.append((token, uid))

    groups = await run_batch_matching(db)
    assert len(groups) >= 1
    group = groups[0]
    return users, group


def _feedback_payload(
    other_user_ids: list[uuid.UUID],
    *,
    rating: int = 4,
    interested_ids: list[uuid.UUID] | None = None,
) -> dict:
    """Build a feedback JSON payload."""
    interested_ids = interested_ids or []
    return {
        "experience_rating": rating,
        "romantic_interests": [
            {"user_id": str(uid), "interested": uid in interested_ids}
            for uid in other_user_ids
        ],
        "block_user_ids": [],
        "report_user_ids": [],
    }


def _other_ids(users: list[tuple[str, uuid.UUID]], current_idx: int) -> list[uuid.UUID]:
    """Get all user IDs except the one at current_idx."""
    return [uid for i, (_, uid) in enumerate(users) if i != current_idx]


async def _submit_all_feedback_with_mutual_match(
    client: AsyncClient,
    db: AsyncSession,
    users: list[tuple[str, uuid.UUID]],
    group: DateGroup,
) -> None:
    """All 4 users submit feedback. M1(0) and F1(2) mutually interested."""
    for i in range(4):
        token, uid = users[i]
        others = _other_ids(users, i)
        if i == 0:
            interested = [users[2][1]]  # M1 -> F1
        elif i == 2:
            interested = [users[0][1]]  # F1 -> M1
        else:
            interested = []

        resp = await client.post(
            f"/api/groups/{group.id}/feedback",
            json=_feedback_payload(others, interested_ids=interested),
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201


# ──────────────────────── Tests ────────────────────────


async def test_mutual_match_has_chat_room(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    await _submit_all_feedback_with_mutual_match(client, db_session, users, group)

    result = await db_session.execute(
        select(Match).where(Match.group_id == group.id)
    )
    matches = list(result.scalars().all())
    assert len(matches) == 1

    match = matches[0]
    assert match.chat_room_id is not None

    # Verify the chat room exists and is "direct" type
    room_result = await db_session.execute(
        select(ChatRoom).where(ChatRoom.id == match.chat_room_id)
    )
    room = room_result.scalar_one()
    assert room.room_type == "direct"

    # Verify both users are participants
    part_result = await db_session.execute(
        select(ChatParticipant).where(ChatParticipant.room_id == room.id)
    )
    participants = list(part_result.scalars().all())
    assert len(participants) == 2
    participant_ids = {p.user_id for p in participants}
    assert participant_ids == {users[0][1], users[2][1]}


async def test_list_my_matches(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    await _submit_all_feedback_with_mutual_match(client, db_session, users, group)

    # M1 should see the match
    resp = await client.get(
        "/api/matches",
        headers={"Authorization": f"Bearer {users[0][0]}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1

    # Find the match for this group
    match = next(m for m in data if m["group_id"] == str(group.id))
    assert match["partner"]["id"] == str(users[2][1])
    assert match["chat_room_id"] is not None


async def test_match_includes_partner_profile(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    await _submit_all_feedback_with_mutual_match(client, db_session, users, group)

    resp = await client.get(
        "/api/matches",
        headers={"Authorization": f"Bearer {users[0][0]}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    match = next(m for m in data if m["group_id"] == str(group.id))
    partner = match["partner"]

    # Partner profile has public fields
    assert "id" in partner
    assert "first_name" in partner
    assert "age" in partner
    assert "gender" in partner
    assert "bio" in partner
    assert "photo_urls" in partner
    assert "interests" in partner
    assert "is_selfie_verified" in partner


async def test_no_private_prefs_in_match(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    await _submit_all_feedback_with_mutual_match(client, db_session, users, group)

    resp = await client.get(
        "/api/matches",
        headers={"Authorization": f"Bearer {users[0][0]}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    match = next(m for m in data if m["group_id"] == str(group.id))
    partner = match["partner"]

    # Private preferences must NOT be exposed
    assert "age_range_min" not in partner
    assert "age_range_max" not in partner


async def test_empty_matches_list(client: AsyncClient, db_session: AsyncSession):
    token, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])

    resp = await client.get(
        "/api/matches",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json() == []


async def test_cannot_see_others_match(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    await _submit_all_feedback_with_mutual_match(client, db_session, users, group)

    # Get the match ID
    result = await db_session.execute(
        select(Match).where(Match.group_id == group.id)
    )
    match = result.scalars().first()
    assert match is not None

    # Create an outsider user
    outsider_token, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])

    # Outsider tries to access the match
    resp = await client.get(
        f"/api/matches/{match.id}",
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert resp.status_code == 403
