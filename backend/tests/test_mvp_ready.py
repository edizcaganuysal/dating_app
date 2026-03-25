"""
Comprehensive MVP readiness test suite.
Tests 14 scenarios covering the full Yuni flow to ensure the app is ship-ready.
"""
import uuid
from datetime import date, timedelta

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import DateGroup, GroupMember
from app.models.match import Match
from app.models.chat import ChatRoom, ChatParticipant
from app.models.report import BlockedPair, FeedbackRating, RomanticInterest
from app.models.date_request import DateRequest
from app.models.user import User
from app.services.matching_service import run_batch_matching


# ── Helpers ──────────────────────────────────────────────────────────────────

NEXT_SAT = date.today() + timedelta(days=(5 - date.today().weekday()) % 7 + 1)


async def make_admin(client: AsyncClient, db: AsyncSession) -> str:
    """Create an admin user and return their token."""
    email = f"admin_{uuid.uuid4().hex[:6]}@utoronto.ca"
    resp = await client.post("/api/auth/register", json={
        "email": email, "password": "AdminPass123!", "first_name": "Admin",
        "last_name": "User", "phone": "000", "gender": "male", "age": 25,
    })
    otp = resp.json()["otp"]
    await client.post("/api/auth/verify-email", json={"email": email, "otp": otp})
    login = await client.post("/api/auth/login", json={"email": email, "password": "AdminPass123!"})
    token = login.json()["access_token"]

    # Make admin in DB
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.is_admin = True
    await db.commit()
    return token


async def create_user_via_admin(
    client: AsyncClient, admin_token: str, *,
    first_name: str, gender: str, age: int = 20,
    interests: list[str] | None = None,
    age_range_min: int = 18, age_range_max: int = 30,
) -> dict:
    """Create a fully set-up user via the admin endpoint."""
    unique = uuid.uuid4().hex[:6]
    resp = await client.post("/api/admin/users/create", json={
        "email": f"{first_name.lower()}.{unique}@mail.utoronto.ca",
        "password": "TestPass123!",
        "first_name": first_name,
        "last_name": f"Test{unique}",
        "phone": "1234567890",
        "gender": gender,
        "age": age,
        "program": "Computer Science",
        "year_of_study": 2,
        "bio": f"Hi I'm {first_name}",
        "photo_urls": [
            f"https://picsum.photos/seed/{unique}a/400/500",
            f"https://picsum.photos/seed/{unique}b/400/500",
            f"https://picsum.photos/seed/{unique}c/400/500",
        ],
        "interests": interests or ["hiking", "cooking", "movies"],
        "vibe_answers": [
            {"question": "Friday night?", "answer": "House party"},
            {"question": "Superpower?", "answer": "Teleportation"},
            {"question": "Coffee?", "answer": "Black coffee"},
            {"question": "Stress?", "answer": "Exercise"},
            {"question": "Love language?", "answer": "Quality time"},
        ],
        "age_range_min": age_range_min,
        "age_range_max": age_range_max,
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 201, f"Failed to create user {first_name}: {resp.text}"
    return resp.json()


async def create_date_request_via_admin(
    client: AsyncClient, admin_token: str, *,
    user_id: str, activity: str = "bowling", group_size: int = 4,
    date_val: date | None = None, time_window: str = "evening",
    pre_group_friend_ids: list[str] | None = None,
) -> dict:
    """Create a date request via admin endpoint."""
    d = date_val or NEXT_SAT
    resp = await client.post("/api/admin/date-requests/create", json={
        "user_id": user_id,
        "group_size": group_size,
        "activity": activity,
        "availability_slots": [{"date": d.isoformat(), "time_window": time_window}],
        "pre_group_friend_ids": pre_group_friend_ids or [],
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 201, f"Failed to create date request for {user_id}: {resp.text}"
    return resp.json()


async def login_user(client: AsyncClient, email: str, password: str = "TestPass123!") -> str:
    """Login and return token."""
    resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]


async def submit_feedback(
    client: AsyncClient, token: str, group_id: str,
    interests: dict[str, bool], block_ids: list[str] | None = None,
    rating: int = 4,
):
    """Submit post-date feedback."""
    romantic = [{"user_id": uid, "interested": val} for uid, val in interests.items()]
    resp = await client.post(f"/api/groups/{group_id}/feedback", json={
        "experience_rating": rating,
        "romantic_interests": romantic,
        "block_user_ids": block_ids or [],
        "report_user_ids": [],
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201, f"Feedback failed: {resp.text}"


# ── SCENARIO 1: Basic 4-person match ────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_1_basic_4_person_match(client: AsyncClient, db_session: AsyncSession):
    """Happy path: 2M + 2F, same activity, same availability → 1 group of 4."""
    admin_token = await make_admin(client, db_session)

    m1 = await create_user_via_admin(client, admin_token, first_name="S1_M1", gender="male")
    m2 = await create_user_via_admin(client, admin_token, first_name="S1_M2", gender="male")
    f1 = await create_user_via_admin(client, admin_token, first_name="S1_F1", gender="female")
    f2 = await create_user_via_admin(client, admin_token, first_name="S1_F2", gender="female")

    for u in [m1, m2, f1, f2]:
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="bowling")

    # Run batch matching
    groups = await run_batch_matching(db_session)
    assert len(groups) >= 1, "Should form at least 1 group"

    # Verify group has 4 members
    group = groups[0]
    members_result = await db_session.execute(
        select(GroupMember).where(GroupMember.group_id == group.id)
    )
    members = list(members_result.scalars().all())
    assert len(members) == 4

    # Verify chat room created
    chat_result = await db_session.execute(
        select(ChatRoom).where(ChatRoom.group_id == group.id)
    )
    chat_room = chat_result.scalar_one_or_none()
    assert chat_room is not None
    assert chat_room.room_type == "group"

    # Submit feedback with mutual interest M1 ↔ F1
    member_ids = {m.user_id: str(m.user_id) for m in members}
    m1_token = await login_user(client, m1["email"])
    m2_token = await login_user(client, m2["email"])
    f1_token = await login_user(client, f1["email"])
    f2_token = await login_user(client, f2["email"])

    gid = str(group.id)
    await submit_feedback(client, m1_token, gid, {f1["id"]: True, f2["id"]: False, m2["id"]: False})
    await submit_feedback(client, m2_token, gid, {f1["id"]: False, f2["id"]: False, m1["id"]: False})
    await submit_feedback(client, f1_token, gid, {m1["id"]: True, m2["id"]: False, f2["id"]: False})
    await submit_feedback(client, f2_token, gid, {m1["id"]: False, m2["id"]: False, f1["id"]: False})

    # Verify mutual match M1-F1
    match_result = await db_session.execute(select(Match).where(Match.group_id == group.id))
    matches = list(match_result.scalars().all())
    assert len(matches) == 1
    match = matches[0]
    pair = {str(match.user1_id), str(match.user2_id)}
    assert pair == {m1["id"], f1["id"]}
    assert match.chat_room_id is not None


# ── SCENARIO 2: Basic 6-person match ────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_2_basic_6_person_match(client: AsyncClient, db_session: AsyncSession):
    """3M + 3F, same activity → 1 group of 6."""
    admin_token = await make_admin(client, db_session)

    users = []
    for i in range(3):
        users.append(await create_user_via_admin(client, admin_token, first_name=f"S2_M{i}", gender="male"))
    for i in range(3):
        users.append(await create_user_via_admin(client, admin_token, first_name=f"S2_F{i}", gender="female"))

    for u in users:
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="dinner", group_size=6)

    groups = await run_batch_matching(db_session)
    assert len(groups) >= 1

    members_result = await db_session.execute(
        select(GroupMember).where(GroupMember.group_id == groups[0].id)
    )
    assert len(list(members_result.scalars().all())) == 6


# ── SCENARIO 3: Multiple groups from large pool ─────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_3_multiple_groups(client: AsyncClient, db_session: AsyncSession):
    """8M + 8F requesting group_size=4 → 4 groups of 4, no user in multiple groups."""
    admin_token = await make_admin(client, db_session)

    all_users = []
    for i in range(8):
        all_users.append(await create_user_via_admin(client, admin_token, first_name=f"S3_M{i}", gender="male"))
    for i in range(8):
        all_users.append(await create_user_via_admin(client, admin_token, first_name=f"S3_F{i}", gender="female"))

    for u in all_users:
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="bowling")

    groups = await run_batch_matching(db_session)
    assert len(groups) == 4, f"Expected 4 groups, got {len(groups)}"

    # Verify no user in multiple groups
    all_member_user_ids = []
    for g in groups:
        mr = await db_session.execute(select(GroupMember).where(GroupMember.group_id == g.id))
        for m in mr.scalars().all():
            all_member_user_ids.append(m.user_id)
    assert len(all_member_user_ids) == len(set(all_member_user_ids)), "A user appears in multiple groups"


# ── SCENARIO 4: Mixed activities split correctly ────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_4_mixed_activities(client: AsyncClient, db_session: AsyncSession):
    """2M+2F want bowling, 2M+2F want dinner → 2 separate groups."""
    admin_token = await make_admin(client, db_session)

    bowling_users = []
    dinner_users = []
    for i in range(2):
        bowling_users.append(await create_user_via_admin(client, admin_token, first_name=f"S4_BM{i}", gender="male"))
        bowling_users.append(await create_user_via_admin(client, admin_token, first_name=f"S4_BF{i}", gender="female"))
        dinner_users.append(await create_user_via_admin(client, admin_token, first_name=f"S4_DM{i}", gender="male"))
        dinner_users.append(await create_user_via_admin(client, admin_token, first_name=f"S4_DF{i}", gender="female"))

    for u in bowling_users:
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="bowling")
    for u in dinner_users:
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="dinner")

    groups = await run_batch_matching(db_session)
    activities = [g.activity for g in groups]
    assert "bowling" in activities
    assert "dinner" in activities
    assert len(groups) >= 2


# ── SCENARIO 5: Pre-group friends stay together ─────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_5_pregroup_friends(client: AsyncClient, db_session: AsyncSession):
    """M1 pre-groups with M2 → they end up in the same group."""
    admin_token = await make_admin(client, db_session)

    m1 = await create_user_via_admin(client, admin_token, first_name="S5_M1", gender="male")
    m2 = await create_user_via_admin(client, admin_token, first_name="S5_M2", gender="male")
    f1 = await create_user_via_admin(client, admin_token, first_name="S5_F1", gender="female")
    f2 = await create_user_via_admin(client, admin_token, first_name="S5_F2", gender="female")

    # M1 requests with M2 as pre-group friend
    await create_date_request_via_admin(
        client, admin_token, user_id=m1["id"], activity="hiking",
        pre_group_friend_ids=[m2["id"]],
    )
    await create_date_request_via_admin(client, admin_token, user_id=m2["id"], activity="hiking")
    await create_date_request_via_admin(client, admin_token, user_id=f1["id"], activity="hiking")
    await create_date_request_via_admin(client, admin_token, user_id=f2["id"], activity="hiking")

    groups = await run_batch_matching(db_session)
    assert len(groups) >= 1

    # Find which group M1 is in
    for g in groups:
        mr = await db_session.execute(select(GroupMember).where(GroupMember.group_id == g.id))
        member_user_ids = {str(m.user_id) for m in mr.scalars().all()}
        if m1["id"] in member_user_ids:
            assert m2["id"] in member_user_ids, "Pre-grouped friends must be in the same group"
            break


# ── SCENARIO 6: Blocked pairs never matched ─────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_6_blocked_pairs(client: AsyncClient, db_session: AsyncSession):
    """M1 blocked F1 → they should never be in the same group."""
    admin_token = await make_admin(client, db_session)

    m1 = await create_user_via_admin(client, admin_token, first_name="S6_M1", gender="male")
    m2 = await create_user_via_admin(client, admin_token, first_name="S6_M2", gender="male")
    f1 = await create_user_via_admin(client, admin_token, first_name="S6_F1", gender="female")
    f2 = await create_user_via_admin(client, admin_token, first_name="S6_F2", gender="female")

    # Create a block: M1 blocks F1
    block = BlockedPair(blocker_id=uuid.UUID(m1["id"]), blocked_id=uuid.UUID(f1["id"]))
    db_session.add(block)
    await db_session.commit()

    for u in [m1, m2, f1, f2]:
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="karaoke")

    groups = await run_batch_matching(db_session)

    # Check that M1 and F1 are NOT in the same group
    for g in groups:
        mr = await db_session.execute(select(GroupMember).where(GroupMember.group_id == g.id))
        member_ids = {str(m.user_id) for m in mr.scalars().all()}
        assert not (m1["id"] in member_ids and f1["id"] in member_ids), \
            "Blocked pair M1 and F1 should not be in the same group"


# ── SCENARIO 7: Age range filtering ─────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_7_age_range_filtering(client: AsyncClient, db_session: AsyncSession):
    """M1 (19, range 18-21) and F1 (25, range 23-28) are incompatible by age."""
    admin_token = await make_admin(client, db_session)

    m1 = await create_user_via_admin(client, admin_token, first_name="S7_M1", gender="male", age=19, age_range_min=18, age_range_max=21)
    m2 = await create_user_via_admin(client, admin_token, first_name="S7_M2", gender="male", age=20, age_range_min=18, age_range_max=25)
    f1 = await create_user_via_admin(client, admin_token, first_name="S7_F1", gender="female", age=25, age_range_min=23, age_range_max=28)
    f2 = await create_user_via_admin(client, admin_token, first_name="S7_F2", gender="female", age=21, age_range_min=19, age_range_max=25)

    for u in [m1, m2, f1, f2]:
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="mini_golf")

    groups = await run_batch_matching(db_session)

    # M1 and F1 should NOT be in the same group (age incompatible)
    for g in groups:
        mr = await db_session.execute(select(GroupMember).where(GroupMember.group_id == g.id))
        member_ids = {str(m.user_id) for m in mr.scalars().all()}
        assert not (m1["id"] in member_ids and f1["id"] in member_ids), \
            "Age-incompatible M1 (19) and F1 (25) should not be grouped"


# ── SCENARIO 8: All same gender → no groups ─────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_8_all_same_gender(client: AsyncClient, db_session: AsyncSession):
    """4 males, 0 females → 0 groups formed."""
    admin_token = await make_admin(client, db_session)

    for i in range(4):
        u = await create_user_via_admin(client, admin_token, first_name=f"S8_M{i}", gender="male")
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="escape_room")

    groups = await run_batch_matching(db_session)
    # Filter to only escape_room groups from this test
    escape_groups = [g for g in groups if g.activity == "escape_room"]
    assert len(escape_groups) == 0, "Cannot form groups with only one gender"


# ── SCENARIO 9: Leftover users stay pending ──────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_9_leftover_pending(client: AsyncClient, db_session: AsyncSession):
    """3M + 2F, group_size=4 → 1 group of 4, 1M left pending."""
    admin_token = await make_admin(client, db_session)

    males = []
    for i in range(3):
        males.append(await create_user_via_admin(client, admin_token, first_name=f"S9_M{i}", gender="male"))
    females = []
    for i in range(2):
        females.append(await create_user_via_admin(client, admin_token, first_name=f"S9_F{i}", gender="female"))

    for u in males + females:
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="art_gallery")

    groups = await run_batch_matching(db_session)
    art_groups = [g for g in groups if g.activity == "art_gallery"]
    assert len(art_groups) == 1

    # Verify 1 male still has pending request
    pending = await db_session.execute(
        select(DateRequest).where(DateRequest.activity == "art_gallery", DateRequest.status == "pending")
    )
    pending_list = list(pending.scalars().all())
    assert len(pending_list) == 1, "One user should be left pending"


# ── SCENARIO 10: "Do not match again" vs neutral ────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_10_block_vs_neutral(client: AsyncClient, db_session: AsyncSession):
    """
    After a date: M1 doesn't pick F1 (neutral), M2 explicitly blocks F2.
    Next round: M1+F1 CAN be re-matched, M2+F2 CANNOT.
    """
    admin_token = await make_admin(client, db_session)

    m1 = await create_user_via_admin(client, admin_token, first_name="S10_M1", gender="male")
    m2 = await create_user_via_admin(client, admin_token, first_name="S10_M2", gender="male")
    f1 = await create_user_via_admin(client, admin_token, first_name="S10_F1", gender="female")
    f2 = await create_user_via_admin(client, admin_token, first_name="S10_F2", gender="female")

    # First date — all 4 in a group via manual matching
    resp = await client.post("/api/admin/matching/manual", json={
        "user_ids": [m1["id"], m2["id"], f1["id"], f2["id"]],
        "activity": "picnic",
        "scheduled_date": (date.today() - timedelta(days=3)).isoformat(),
        "scheduled_time": "14:00",
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 201
    group_id = resp.json()["id"]

    # Feedback: M1 not interested in F1 (neutral), M2 blocks F2
    m1_token = await login_user(client, m1["email"])
    m2_token = await login_user(client, m2["email"])
    f1_token = await login_user(client, f1["email"])
    f2_token = await login_user(client, f2["email"])

    await submit_feedback(client, m1_token, group_id, {f1["id"]: False, f2["id"]: False, m2["id"]: False})
    await submit_feedback(client, m2_token, group_id, {f1["id"]: False, f2["id"]: False, m1["id"]: False}, block_ids=[f2["id"]])
    await submit_feedback(client, f1_token, group_id, {m1["id"]: False, m2["id"]: False, f2["id"]: False})
    await submit_feedback(client, f2_token, group_id, {m1["id"]: False, m2["id"]: False, f1["id"]: False})

    # Verify block exists for M2-F2 but NOT for M1-F1
    blocks = await db_session.execute(select(BlockedPair))
    block_pairs = {(str(b.blocker_id), str(b.blocked_id)) for b in blocks.scalars().all()}
    assert (m2["id"], f2["id"]) in block_pairs, "M2 should have blocked F2"
    assert (m1["id"], f1["id"]) not in block_pairs, "M1 did NOT block F1 (neutral)"

    # Second round: create new requests for all 4
    for u in [m1, m2, f1, f2]:
        await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity="museum")

    groups = await run_batch_matching(db_session)
    museum_groups = [g for g in groups if g.activity == "museum"]

    # M2 and F2 should NOT be in the same group
    for g in museum_groups:
        mr = await db_session.execute(select(GroupMember).where(GroupMember.group_id == g.id))
        member_ids = {str(m.user_id) for m in mr.scalars().all()}
        assert not (m2["id"] in member_ids and f2["id"] in member_ids), \
            "Blocked pair M2-F2 should not be re-matched"


# ── SCENARIO 11: No-show detection ──────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_11_noshow(client: AsyncClient, db_session: AsyncSession):
    """User who doesn't submit feedback gets flagged as no-show."""
    admin_token = await make_admin(client, db_session)

    m1 = await create_user_via_admin(client, admin_token, first_name="S11_M1", gender="male")
    m2 = await create_user_via_admin(client, admin_token, first_name="S11_M2", gender="male")
    f1 = await create_user_via_admin(client, admin_token, first_name="S11_F1", gender="female")
    f2 = await create_user_via_admin(client, admin_token, first_name="S11_F2", gender="female")

    # Create a completed group in the past
    resp = await client.post("/api/admin/matching/manual", json={
        "user_ids": [m1["id"], m2["id"], f1["id"], f2["id"]],
        "activity": "trivia_night",
        "scheduled_date": (date.today() - timedelta(days=5)).isoformat(),
        "scheduled_time": "19:00",
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 201

    # Mark group as completed
    group_result = await db_session.execute(
        select(DateGroup).where(DateGroup.activity == "trivia_night")
    )
    for g in group_result.scalars().all():
        g.status = "completed"
    await db_session.commit()

    # Only M1, F1, F2 submit feedback (M2 is a no-show)
    m1_token = await login_user(client, m1["email"])
    f1_token = await login_user(client, f1["email"])
    f2_token = await login_user(client, f2["email"])

    gid = resp.json()["id"]
    await submit_feedback(client, m1_token, gid, {f1["id"]: False, f2["id"]: False, m2["id"]: False})
    await submit_feedback(client, f1_token, gid, {m1["id"]: False, m2["id"]: False, f2["id"]: False})
    await submit_feedback(client, f2_token, gid, {m1["id"]: False, m2["id"]: False, f1["id"]: False})

    # Trigger no-show check
    resp = await client.post("/api/admin/noshow-check", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200

    # Verify M2's no_show_count increased
    await db_session.refresh(await db_session.get(User, uuid.UUID(m2["id"])))
    m2_user = await db_session.get(User, uuid.UUID(m2["id"]))
    assert m2_user.no_show_count >= 1


# ── SCENARIO 12: Full end-to-end flow ───────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_12_full_e2e(client: AsyncClient, db_session: AsyncSession):
    """12 users (6M+6F), 3 activities, batch match → 3 groups, feedback, matches."""
    admin_token = await make_admin(client, db_session)

    activities = ["bowling", "dinner", "karaoke"]
    all_users = {}  # activity -> [users]

    for act in activities:
        act_users = []
        for i in range(2):
            act_users.append(await create_user_via_admin(
                client, admin_token, first_name=f"S12_{act[:3]}_M{i}", gender="male"
            ))
        for i in range(2):
            act_users.append(await create_user_via_admin(
                client, admin_token, first_name=f"S12_{act[:3]}_F{i}", gender="female"
            ))
        all_users[act] = act_users

    # Create date requests
    for act, users in all_users.items():
        for u in users:
            await create_date_request_via_admin(client, admin_token, user_id=u["id"], activity=act)

    # Batch match
    groups = await run_batch_matching(db_session)
    matched_activities = {g.activity for g in groups}
    assert "bowling" in matched_activities
    assert "dinner" in matched_activities
    assert "karaoke" in matched_activities

    # Submit feedback for bowling group with mutual interest
    bowling_group = [g for g in groups if g.activity == "bowling"][0]
    bg_members = await db_session.execute(
        select(GroupMember).where(GroupMember.group_id == bowling_group.id)
    )
    bg_member_list = list(bg_members.scalars().all())

    # Separate into males and females
    bg_males = []
    bg_females = []
    for m in bg_member_list:
        user = await db_session.get(User, m.user_id)
        if user.gender == "male":
            bg_males.append(user)
        else:
            bg_females.append(user)

    # Login all bowling members
    tokens = {}
    for m in bg_member_list:
        user = await db_session.get(User, m.user_id)
        tokens[str(user.id)] = await login_user(client, user.email)

    gid = str(bowling_group.id)
    other_ids = [str(m.user_id) for m in bg_member_list]

    # Everyone submits: first male and first female mutually interested
    for m in bg_member_list:
        uid = str(m.user_id)
        user = await db_session.get(User, m.user_id)
        interests = {}
        for other_m in bg_member_list:
            if other_m.user_id == m.user_id:
                continue
            other_user = await db_session.get(User, other_m.user_id)
            # First male likes first female and vice versa
            if user == bg_males[0] and other_user == bg_females[0]:
                interests[str(other_m.user_id)] = True
            elif user == bg_females[0] and other_user == bg_males[0]:
                interests[str(other_m.user_id)] = True
            else:
                interests[str(other_m.user_id)] = False
        await submit_feedback(client, tokens[uid], gid, interests)

    # Verify match created
    match_result = await db_session.execute(select(Match).where(Match.group_id == bowling_group.id))
    matches = list(match_result.scalars().all())
    assert len(matches) == 1

    # Verify analytics
    analytics_resp = await client.get("/api/admin/analytics", headers={"Authorization": f"Bearer {admin_token}"})
    assert analytics_resp.status_code == 200
    analytics = analytics_resp.json()
    assert analytics["total_groups"] >= 3
    assert analytics["total_matches"] >= 1


# ── SCENARIO 13: Concurrent date requests validation ────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_13_concurrent_requests(client: AsyncClient, db_session: AsyncSession):
    """User can't have 2 pending requests. Cancel first, then create new."""
    admin_token = await make_admin(client, db_session)
    user = await create_user_via_admin(client, admin_token, first_name="S13_User", gender="male")

    # First request succeeds
    await create_date_request_via_admin(client, admin_token, user_id=user["id"], activity="bowling")

    # Second request should fail (409)
    resp = await client.post("/api/admin/date-requests/create", json={
        "user_id": user["id"],
        "group_size": 4,
        "activity": "dinner",
        "availability_slots": [{"date": NEXT_SAT.isoformat(), "time_window": "evening"}],
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 409

    # Cancel the first via user endpoint
    user_token = await login_user(client, user["email"])
    requests_resp = await client.get("/api/date-requests", headers={"Authorization": f"Bearer {user_token}"})
    req_id = requests_resp.json()[0]["id"]
    await client.delete(f"/api/date-requests/{req_id}", headers={"Authorization": f"Bearer {user_token}"})

    # Now creating a new one should succeed
    await create_date_request_via_admin(client, admin_token, user_id=user["id"], activity="dinner")


# ── SCENARIO 14: Admin manual matching ───────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_scenario_14_admin_manual_match(client: AsyncClient, db_session: AsyncSession):
    """Admin manually creates a group from 4 users with no date requests."""
    admin_token = await make_admin(client, db_session)

    m1 = await create_user_via_admin(client, admin_token, first_name="S14_M1", gender="male")
    m2 = await create_user_via_admin(client, admin_token, first_name="S14_M2", gender="male")
    f1 = await create_user_via_admin(client, admin_token, first_name="S14_F1", gender="female")
    f2 = await create_user_via_admin(client, admin_token, first_name="S14_F2", gender="female")

    # Admin creates group manually
    resp = await client.post("/api/admin/matching/manual", json={
        "user_ids": [m1["id"], m2["id"], f1["id"], f2["id"]],
        "activity": "board_games",
        "scheduled_date": NEXT_SAT.isoformat(),
        "scheduled_time": "19:00",
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 201
    group = resp.json()
    assert len(group["members"]) == 4

    # Verify chat room created
    chat_result = await db_session.execute(
        select(ChatRoom).where(ChatRoom.group_id == uuid.UUID(group["id"]))
    )
    chat = chat_result.scalar_one_or_none()
    assert chat is not None

    # Members can submit feedback
    m1_token = await login_user(client, m1["email"])
    await submit_feedback(client, m1_token, group["id"], {f1["id"]: True, f2["id"]: False, m2["id"]: False})
