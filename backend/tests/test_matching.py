import datetime as dt
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.date_request import AvailabilitySlot, DateRequest, PreGroupFriend
from app.models.group import DateGroup, GroupMember
from app.models.chat import ChatRoom, ChatParticipant
from app.models.report import BlockedPair
from app.models.user import User
from app.services.matching_service import run_batch_matching
from tests.conftest import create_verified_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

SATURDAY = dt.date(2026, 4, 4)
SUNDAY = dt.date(2026, 4, 5)


async def _create_user_with_request(
    client: AsyncClient,
    db: AsyncSession,
    *,
    gender: str = "male",
    age: int = 21,
    activity: str = "bowling",
    group_size: int = 6,
    date: dt.date = SATURDAY,
    time_window: str = "evening",
    interests: list[str] | None = None,
    pre_group_friend_ids: list[uuid.UUID] | None = None,
    age_range_min: int = 18,
    age_range_max: int = 30,
) -> tuple[str, uuid.UUID]:
    """Create a verified user with a pending date request. Returns (token, user_id)."""
    unique = uuid.uuid4().hex[:8]
    email = f"match{unique}@utoronto.ca"
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

    # Get user_id
    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = uuid.UUID(me_resp.json()["id"])

    # Update user preferences directly in DB
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(
            age_range_min=age_range_min,
            age_range_max=age_range_max,
            interests=interests or ["music", "movies", "travel"],
            attractiveness_score=5.0,
        )
    )
    await db.commit()

    # Create date request
    req_json = {
        "group_size": group_size,
        "activity": activity,
        "availability_slots": [{"date": date.isoformat(), "time_window": time_window}],
        "pre_group_friend_ids": [str(fid) for fid in (pre_group_friend_ids or [])],
    }
    dr_resp = await client.post(
        "/api/date-requests",
        json=req_json,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dr_resp.status_code == 201, dr_resp.text

    return token, user_id


async def _make_admin(db: AsyncSession, user_id: uuid.UUID):
    await db.execute(update(User).where(User.id == user_id).values(is_admin=True))
    await db.commit()


# ──────────────────────── Tests ────────────────────────


async def test_match_6_compatible_users(client: AsyncClient, db_session: AsyncSession):
    """3M + 3F with same activity, overlapping availability -> 1 group of 6."""
    males = []
    for _ in range(3):
        _, uid = await _create_user_with_request(client, db_session, gender="male")
        males.append(uid)

    females = []
    for _ in range(3):
        _, uid = await _create_user_with_request(client, db_session, gender="female")
        females.append(uid)

    groups = await run_batch_matching(db_session)

    assert len(groups) == 1
    group = groups[0]
    assert len(group.members) == 6
    member_ids = {m.user_id for m in group.members}
    assert member_ids == set(males + females)

    # Verify all requests marked as matched
    for uid in males + females:
        result = await db_session.execute(
            select(DateRequest).where(DateRequest.user_id == uid)
        )
        req = result.scalar_one()
        assert req.status == "matched"

    # Verify group chat room created
    result = await db_session.execute(
        select(ChatRoom).where(ChatRoom.group_id == group.id)
    )
    chat_room = result.scalar_one()
    assert chat_room.room_type == "group"

    result = await db_session.execute(
        select(ChatParticipant).where(ChatParticipant.room_id == chat_room.id)
    )
    participants = result.scalars().all()
    assert len(participants) == 6


async def test_match_8_users_into_two_groups(client: AsyncClient, db_session: AsyncSession):
    """4M + 4F requesting group_size=4 -> 2 groups of 4."""
    for _ in range(4):
        await _create_user_with_request(client, db_session, gender="male", group_size=4)
    for _ in range(4):
        await _create_user_with_request(client, db_session, gender="female", group_size=4)

    groups = await run_batch_matching(db_session)

    assert len(groups) == 2
    for group in groups:
        assert len(group.members) == 4
        genders = [m.user.gender for m in group.members]
        assert genders.count("male") == 2
        assert genders.count("female") == 2


async def test_pregroup_friends_stay_together(client: AsyncClient, db_session: AsyncSession):
    """User A and B are pre-grouped. They must end up in the same group."""
    # Create user A first (without request)
    unique_a = uuid.uuid4().hex[:8]
    email_a = f"preA{unique_a}@utoronto.ca"
    reg = await client.post("/api/auth/register", json={
        "email": email_a, "password": "TestPassword123!",
        "first_name": "PreA", "last_name": "Test",
        "phone": "1234567890", "gender": "male", "age": 21,
    })
    otp_a = reg.json()["otp"]
    await client.post("/api/auth/verify-email", json={"email": email_a, "otp": otp_a})
    login_a = await client.post("/api/auth/login", json={"email": email_a, "password": "TestPassword123!"})
    token_a = login_a.json()["access_token"]
    me_a = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    user_a_id = uuid.UUID(me_a.json()["id"])

    await db_session.execute(
        update(User).where(User.id == user_a_id).values(interests=["music"], attractiveness_score=5.0)
    )
    await db_session.commit()

    # Create user B (same gender as A)
    unique_b = uuid.uuid4().hex[:8]
    email_b = f"preB{unique_b}@utoronto.ca"
    reg = await client.post("/api/auth/register", json={
        "email": email_b, "password": "TestPassword123!",
        "first_name": "PreB", "last_name": "Test",
        "phone": "1234567890", "gender": "male", "age": 21,
    })
    otp_b = reg.json()["otp"]
    await client.post("/api/auth/verify-email", json={"email": email_b, "otp": otp_b})
    login_b = await client.post("/api/auth/login", json={"email": email_b, "password": "TestPassword123!"})
    token_b = login_b.json()["access_token"]
    me_b = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    user_b_id = uuid.UUID(me_b.json()["id"])

    await db_session.execute(
        update(User).where(User.id == user_b_id).values(interests=["music"], attractiveness_score=5.0)
    )
    await db_session.commit()

    # A creates a request with B as pre-group friend
    dr_resp = await client.post("/api/date-requests", json={
        "group_size": 4,
        "activity": "bowling",
        "availability_slots": [{"date": SATURDAY.isoformat(), "time_window": "evening"}],
        "pre_group_friend_ids": [str(user_b_id)],
    }, headers={"Authorization": f"Bearer {token_a}"})
    assert dr_resp.status_code == 201, dr_resp.text

    # B creates a request (no pre-group but will be linked via A)
    dr_resp = await client.post("/api/date-requests", json={
        "group_size": 4,
        "activity": "bowling",
        "availability_slots": [{"date": SATURDAY.isoformat(), "time_window": "evening"}],
    }, headers={"Authorization": f"Bearer {token_b}"})
    assert dr_resp.status_code == 201, dr_resp.text

    # Create 2 females
    female_ids = []
    for _ in range(2):
        _, fid = await _create_user_with_request(
            client, db_session, gender="female", group_size=4,
        )
        female_ids.append(fid)

    groups = await run_batch_matching(db_session)

    assert len(groups) == 1
    member_ids = {m.user_id for m in groups[0].members}
    assert user_a_id in member_ids
    assert user_b_id in member_ids


async def test_blocked_pair_never_grouped(client: AsyncClient, db_session: AsyncSession):
    """User A blocked User B. They must NOT be in the same group."""
    # Create 3 males
    male_tokens_ids = []
    for _ in range(3):
        token, uid = await _create_user_with_request(client, db_session, gender="male")
        male_tokens_ids.append((token, uid))

    # Create 3 females
    female_ids = []
    for _ in range(3):
        _, uid = await _create_user_with_request(client, db_session, gender="female")
        female_ids.append(uid)

    # Block: first male blocks first female
    blocker_id = male_tokens_ids[0][1]
    blocked_id = female_ids[0]
    block = BlockedPair(blocker_id=blocker_id, blocked_id=blocked_id)
    db_session.add(block)
    await db_session.commit()

    groups = await run_batch_matching(db_session)

    # The blocked pair should never be in the same group
    for group in groups:
        member_ids = {m.user_id for m in group.members}
        assert not (blocker_id in member_ids and blocked_id in member_ids), \
            "Blocked pair found in the same group!"


async def test_no_match_different_activities(client: AsyncClient, db_session: AsyncSession):
    """3M want bowling, 3F want karaoke -> no groups formed."""
    for _ in range(3):
        await _create_user_with_request(client, db_session, gender="male", activity="bowling")
    for _ in range(3):
        await _create_user_with_request(client, db_session, gender="female", activity="karaoke")

    groups = await run_batch_matching(db_session)
    assert len(groups) == 0


async def test_no_match_no_availability_overlap(client: AsyncClient, db_session: AsyncSession):
    """3M available Saturday, 3F available Sunday -> no groups."""
    for _ in range(3):
        await _create_user_with_request(client, db_session, gender="male", date=SATURDAY)
    for _ in range(3):
        await _create_user_with_request(client, db_session, gender="female", date=SUNDAY)

    groups = await run_batch_matching(db_session)
    assert len(groups) == 0


async def test_leftover_users_stay_pending(client: AsyncClient, db_session: AsyncSession):
    """5M + 3F requesting group_size=4 -> 1 group of 4, leftover males stay pending."""
    male_ids = []
    for _ in range(5):
        _, uid = await _create_user_with_request(client, db_session, gender="male", group_size=4)
        male_ids.append(uid)

    female_ids = []
    for _ in range(3):
        _, uid = await _create_user_with_request(client, db_session, gender="female", group_size=4)
        female_ids.append(uid)

    groups = await run_batch_matching(db_session)

    # Can form at most 1 group (only 3 females, need 2 per group, but we have 5 males)
    # Actually with 3F we can only fill 1 group of 4 (2M + 2F), leaving 3M and 1F pending
    assert len(groups) == 1
    assert len(groups[0].members) == 4

    matched_ids = {m.user_id for m in groups[0].members}

    # Check leftover users are still pending
    pending_count = 0
    for uid in male_ids + female_ids:
        if uid not in matched_ids:
            result = await db_session.execute(
                select(DateRequest).where(DateRequest.user_id == uid)
            )
            req = result.scalar_one()
            assert req.status == "pending"
            pending_count += 1

    assert pending_count == 4  # 3M + 1F leftover


async def test_my_groups_endpoint(client: AsyncClient, db_session: AsyncSession):
    """After matching, GET /api/matching/my-groups returns the group with member profiles."""
    tokens = []
    for _ in range(3):
        token, _ = await _create_user_with_request(client, db_session, gender="male")
        tokens.append(token)
    for _ in range(3):
        token, _ = await _create_user_with_request(client, db_session, gender="female")
        tokens.append(token)

    # Make the first user admin to run batch
    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens[0]}"})
    admin_id = uuid.UUID(me_resp.json()["id"])
    await _make_admin(db_session, admin_id)

    # Run batch via API
    batch_resp = await client.post(
        "/api/admin/matching/run-batch",
        headers={"Authorization": f"Bearer {tokens[0]}"},
    )
    assert batch_resp.status_code == 200
    data = batch_resp.json()
    assert data["groups_formed"] == 1

    # Check my-groups for first user
    my_resp = await client.get(
        "/api/matching/my-groups",
        headers={"Authorization": f"Bearer {tokens[0]}"},
    )
    assert my_resp.status_code == 200
    my_groups = my_resp.json()
    assert len(my_groups) == 1
    assert len(my_groups[0]["members"]) == 6
    assert my_groups[0]["activity"] == "bowling"

    # Each member should have profile info
    for member in my_groups[0]["members"]:
        assert "first_name" in member
        assert "user_id" in member
        assert "gender" in member
