import datetime as dt
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import DateGroup, GroupMember
from app.models.match import Match
from app.models.report import BlockedPair, FeedbackRating, Report, RomanticInterest
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
    email = f"fb{unique}@utoronto.ca"
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
    block_ids: list[uuid.UUID] | None = None,
    report_ids: list[uuid.UUID] | None = None,
    report_category: str | None = None,
) -> dict:
    """Build a feedback JSON payload."""
    interested_ids = interested_ids or []
    return {
        "experience_rating": rating,
        "romantic_interests": [
            {"user_id": str(uid), "interested": uid in interested_ids}
            for uid in other_user_ids
        ],
        "block_user_ids": [str(uid) for uid in (block_ids or [])],
        "report_user_ids": [str(uid) for uid in (report_ids or [])],
        "report_category": report_category,
    }


def _other_ids(users: list[tuple[str, uuid.UUID]], current_idx: int) -> list[uuid.UUID]:
    """Get all user IDs except the one at current_idx."""
    return [uid for i, (_, uid) in enumerate(users) if i != current_idx]


# ──────────────────────── Tests ────────────────────────


async def test_submit_feedback(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    token, _ = users[0]
    others = _other_ids(users, 0)

    resp = await client.post(
        f"/api/groups/{group.id}/feedback",
        json=_feedback_payload(others, rating=5),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["experience_rating"] == 5
    assert data["group_id"] == str(group.id)


async def test_submit_feedback_not_member(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    outsider_token, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])

    resp = await client.post(
        f"/api/groups/{group.id}/feedback",
        json=_feedback_payload([users[1][1]], rating=3),
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert resp.status_code == 403


async def test_submit_feedback_twice(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    token, _ = users[0]
    others = _other_ids(users, 0)
    payload = _feedback_payload(others, rating=4)

    resp1 = await client.post(
        f"/api/groups/{group.id}/feedback",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 201

    resp2 = await client.post(
        f"/api/groups/{group.id}/feedback",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 409


async def test_rating_out_of_range(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    token, _ = users[0]
    others = _other_ids(users, 0)

    resp = await client.post(
        f"/api/groups/{group.id}/feedback",
        json=_feedback_payload(others, rating=6),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


async def test_mutual_interest_creates_match(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    # M1(0) likes F1(2), F1(2) likes M1(0) — mutual
    # All 4 must submit for match detection

    for i in range(4):
        token, uid = users[i]
        others = _other_ids(users, i)
        # M1 interested in F1; F1 interested in M1
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

    # Check match was created
    result = await db_session.execute(
        select(Match).where(Match.group_id == group.id)
    )
    matches = list(result.scalars().all())
    assert len(matches) == 1
    match_user_ids = {matches[0].user1_id, matches[0].user2_id}
    assert match_user_ids == {users[0][1], users[2][1]}


async def test_one_sided_interest_no_match(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    # M1 likes F1, but F1 does NOT like M1

    for i in range(4):
        token, uid = users[i]
        others = _other_ids(users, i)
        if i == 0:
            interested = [users[2][1]]  # M1 -> F1
        else:
            interested = []  # No one else interested in anyone

        resp = await client.post(
            f"/api/groups/{group.id}/feedback",
            json=_feedback_payload(others, interested_ids=interested),
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201

    result = await db_session.execute(
        select(Match).where(Match.group_id == group.id)
    )
    matches = list(result.scalars().all())
    assert len(matches) == 0


async def test_block_creates_blocked_pair(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    token, blocker_id = users[0]
    blocked_id = users[3][1]  # M1 blocks F2
    others = _other_ids(users, 0)

    resp = await client.post(
        f"/api/groups/{group.id}/feedback",
        json=_feedback_payload(others, block_ids=[blocked_id]),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201

    result = await db_session.execute(
        select(BlockedPair).where(
            BlockedPair.blocker_id == blocker_id,
            BlockedPair.blocked_id == blocked_id,
        )
    )
    assert result.scalar_one_or_none() is not None


async def test_report_creates_report(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    token, reporter_id = users[0]
    reported_id = users[3][1]  # M1 reports F2
    others = _other_ids(users, 0)

    resp = await client.post(
        f"/api/groups/{group.id}/feedback",
        json=_feedback_payload(
            others,
            report_ids=[reported_id],
            report_category="inappropriate",
        ),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201

    result = await db_session.execute(
        select(Report).where(
            Report.reporter_id == reporter_id,
            Report.reported_id == reported_id,
        )
    )
    report = result.scalar_one_or_none()
    assert report is not None
    assert report.category == "inappropriate"


async def test_matches_only_checked_when_all_submitted(client: AsyncClient, db_session: AsyncSession):
    users, group = await _create_matched_group(client, db_session)
    # M1(0) and F1(2) like each other — but only submit 3 of 4 first

    for i in range(3):  # Only first 3 submit
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

    # No matches yet — only 3 of 4 submitted
    result = await db_session.execute(
        select(Match).where(Match.group_id == group.id)
    )
    assert len(list(result.scalars().all())) == 0

    # 4th member submits
    token, uid = users[3]
    others = _other_ids(users, 3)
    resp = await client.post(
        f"/api/groups/{group.id}/feedback",
        json=_feedback_payload(others, interested_ids=[]),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201

    # Now match should exist
    result = await db_session.execute(
        select(Match).where(Match.group_id == group.id)
    )
    matches = list(result.scalars().all())
    assert len(matches) == 1
    match_user_ids = {matches[0].user1_id, matches[0].user2_id}
    assert match_user_ids == {users[0][1], users[2][1]}
