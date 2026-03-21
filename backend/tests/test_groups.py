import datetime as dt
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.date_request import DateRequest
from app.models.group import DateGroup, GroupMember
from app.models.chat import ChatRoom
from app.models.user import User
from app.services.matching_service import run_batch_matching
from tests.conftest import create_verified_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

SATURDAY = dt.date(2026, 5, 2)


async def _create_user_with_request(
    client: AsyncClient,
    db: AsyncSession,
    *,
    gender: str = "male",
    age: int = 21,
    activity: str = "dinner",
    group_size: int = 4,
    date: dt.date = SATURDAY,
    time_window: str = "evening",
) -> tuple[str, uuid.UUID]:
    """Create a verified user with a pending date request. Returns (token, user_id)."""
    unique = uuid.uuid4().hex[:8]
    email = f"grp{unique}@utoronto.ca"
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
    activity: str = "dinner",
) -> tuple[list[tuple[str, uuid.UUID]], DateGroup]:
    """Create 2M + 2F, run matching, return (user_list, group)."""
    users = []
    for _ in range(2):
        token, uid = await _create_user_with_request(client, db, gender="male", activity=activity)
        users.append((token, uid))
    for _ in range(2):
        token, uid = await _create_user_with_request(client, db, gender="female", activity=activity)
        users.append((token, uid))

    groups = await run_batch_matching(db)
    assert len(groups) >= 1
    group = groups[0]
    return users, group


# ──────────────────────── Tests ────────────────────────


async def test_get_group_detail_as_member(client: AsyncClient, db_session: AsyncSession):
    """Member can see group with all member profiles."""
    users, group = await _create_matched_group(client, db_session)
    token = users[0][0]

    resp = await client.get(
        f"/api/groups/{group.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["id"] == str(group.id)
    assert data["activity"] == "dinner"
    assert data["status"] == "upcoming"
    assert len(data["members"]) == 4

    # Each member has a profile with expected fields
    for member in data["members"]:
        assert "user_id" in member
        profile = member["profile"]
        assert "first_name" in profile
        assert "age" in profile
        assert "gender" in profile
        assert "is_selfie_verified" in profile


async def test_get_group_detail_no_private_prefs(client: AsyncClient, db_session: AsyncSession):
    """Verify response does NOT contain age_range_min/max for other members."""
    users, group = await _create_matched_group(client, db_session)
    token = users[0][0]

    resp = await client.get(
        f"/api/groups/{group.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    for member in data["members"]:
        profile = member["profile"]
        assert "age_range_min" not in profile
        assert "age_range_max" not in profile


async def test_get_group_detail_non_member(client: AsyncClient, db_session: AsyncSession):
    """Non-member gets 403."""
    users, group = await _create_matched_group(client, db_session)

    # Create a user who is NOT in the group
    outsider_token, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])

    resp = await client.get(
        f"/api/groups/{group.id}",
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert resp.status_code == 403


async def test_icebreakers(client: AsyncClient, db_session: AsyncSession):
    """Returns exactly 3 prompts, all strings."""
    users, group = await _create_matched_group(client, db_session)
    token = users[0][0]

    resp = await client.get(
        f"/api/groups/{group.id}/icebreakers",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert len(data["prompts"]) == 3
    for prompt in data["prompts"]:
        assert isinstance(prompt, str)
        assert len(prompt) > 0


async def test_venues_for_activity(client: AsyncClient, db_session: AsyncSession):
    """Group with activity='dinner' gets restaurant suggestions."""
    users, group = await _create_matched_group(client, db_session, activity="dinner")
    token = users[0][0]

    resp = await client.get(
        f"/api/groups/{group.id}/venues",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["activity"] == "dinner"
    assert len(data["venues"]) >= 2
    venue_names = [v["name"] for v in data["venues"]]
    assert "Pai Northern Thai" in venue_names


async def test_venues_include_required_fields(client: AsyncClient, db_session: AsyncSession):
    """Each venue has name, address, neighborhood, price_range."""
    users, group = await _create_matched_group(client, db_session, activity="bowling")
    token = users[0][0]

    resp = await client.get(
        f"/api/groups/{group.id}/venues",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["activity"] == "bowling"
    for venue in data["venues"]:
        assert "name" in venue
        assert "address" in venue
        assert "neighborhood" in venue
        assert "price_range" in venue
        assert venue["price_range"] in ("$", "$$", "$$$")
