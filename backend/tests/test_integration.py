"""
End-to-end integration tests that exercise the full user flow:
registration → profile → date request → matching → feedback → matches → chat.
"""

import datetime as dt
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatParticipant, ChatRoom
from app.models.group import DateGroup, GroupMember
from app.models.match import Match
from app.models.report import BlockedPair, RomanticInterest
from app.models.user import User
from app.services.matching_service import run_batch_matching

pytestmark = pytest.mark.asyncio(loop_scope="session")

SATURDAY = dt.date(2026, 5, 9)
PASSWORD = "TestPassword123!"

VIBE_ANSWERS = [
    {"question": "Ideal weekend?", "answer": "Exploring the city"},
    {"question": "Favourite cuisine?", "answer": "Italian"},
    {"question": "Morning or night?", "answer": "Night owl"},
    {"question": "Hidden talent?", "answer": "Cooking"},
    {"question": "Life motto?", "answer": "YOLO"},
]


# ──────────────── Helpers ────────────────


async def _register_and_login(
    client: AsyncClient,
    *,
    gender: str = "male",
    age: int = 21,
    suffix: str = "",
) -> tuple[str, dict]:
    """Register, verify email, login. Returns (token, {email, first_name, id})."""
    unique = suffix or uuid.uuid4().hex[:8]
    email = f"integ{unique}@utoronto.ca"

    reg = await client.post("/api/auth/register", json={
        "email": email,
        "password": PASSWORD,
        "first_name": f"User{unique}",
        "last_name": "Integ",
        "phone": "1234567890",
        "gender": gender,
        "age": age,
    })
    assert reg.status_code == 201, reg.text
    otp = reg.json()["otp"]

    await client.post("/api/auth/verify-email", json={"email": email, "otp": otp})

    login = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]

    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = me.json()["id"]

    return token, {"email": email, "first_name": f"User{unique}", "id": user_id}


async def _create_profile(client: AsyncClient, token: str, *, interests: list[str] | None = None):
    """Create a full profile with photos, bio, vibe answers."""
    resp = await client.post("/api/profiles", json={
        "bio": "Integration test user bio",
        "program": "Computer Science",
        "year_of_study": 3,
        "photo_urls": ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"],
        "interests": interests or ["music", "movies", "travel"],
        "vibe_answers": VIBE_ANSWERS,
        "age_range_min": 18,
        "age_range_max": 30,
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_date_request(
    client: AsyncClient,
    token: str,
    *,
    activity: str = "bowling",
    group_size: int = 6,
    pre_group_friend_ids: list[str] | None = None,
):
    """Create a date request."""
    resp = await client.post("/api/date-requests", json={
        "group_size": group_size,
        "activity": activity,
        "availability_slots": [{"date": SATURDAY.isoformat(), "time_window": "evening"}],
        "pre_group_friend_ids": pre_group_friend_ids or [],
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _make_admin(db: AsyncSession, user_id: str):
    await db.execute(update(User).where(User.id == uuid.UUID(user_id)).values(is_admin=True))
    await db.commit()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _feedback_payload(
    other_ids: list[str],
    *,
    interested_ids: list[str] | None = None,
    block_ids: list[str] | None = None,
    rating: int = 4,
) -> dict:
    interested_ids = interested_ids or []
    return {
        "experience_rating": rating,
        "romantic_interests": [
            {"user_id": uid, "interested": uid in interested_ids}
            for uid in other_ids
        ],
        "block_user_ids": block_ids or [],
        "report_user_ids": [],
    }


# ──────────────── Full Date Flow ────────────────


async def test_full_date_flow(client: AsyncClient, db_session: AsyncSession):
    """
    End-to-end: 6 users register → profile → date request → batch match →
    group verified → icebreakers → venues → feedback with romantic interests →
    mutual matches created → 1-on-1 chat rooms → match listing → chat room listing.
    """

    # ── 1-3. Register 6 users (3M, 3F), verify, login ──
    males: list[tuple[str, dict]] = []
    for i in range(3):
        token, info = await _register_and_login(client, gender="male", suffix=f"im{i}{uuid.uuid4().hex[:4]}")
        males.append((token, info))

    females: list[tuple[str, dict]] = []
    for i in range(3):
        token, info = await _register_and_login(client, gender="female", suffix=f"if{i}{uuid.uuid4().hex[:4]}")
        females.append((token, info))

    all_users = males + females  # indices 0-2 male, 3-5 female

    # ── 4. Create profiles for all ──
    for token, _ in all_users:
        await _create_profile(client, token)

    # ── 5. Create date requests: all want bowling, group_size=6, same availability ──
    for token, _ in all_users:
        await _create_date_request(client, token)

    # ── 6. Register an admin user and run batch matching ──
    admin_token, admin_info = await _register_and_login(client, gender="male", suffix=f"admin{uuid.uuid4().hex[:4]}")
    await _create_profile(client, admin_token)
    await _make_admin(db_session, admin_info["id"])

    batch_resp = await client.post("/api/admin/matching/run-batch", headers=_auth(admin_token))
    assert batch_resp.status_code == 200
    batch_data = batch_resp.json()
    assert batch_data["groups_formed"] >= 1

    # ── 7. Verify: 1 group created with all 6 members ──
    # Check via my-groups for the first user
    my_groups_resp = await client.get("/api/matching/my-groups", headers=_auth(males[0][0]))
    assert my_groups_resp.status_code == 200
    my_groups = my_groups_resp.json()
    assert len(my_groups) == 1
    group = my_groups[0]
    group_id = group["id"]
    assert len(group["members"]) == 6

    # Verify all 6 users are in the group
    member_user_ids = {m["user_id"] for m in group["members"]}
    for _, info in all_users:
        assert info["id"] in member_user_ids

    # ── 8. Verify: group chat room created with 6 participants ──
    group_detail_resp = await client.get(f"/api/groups/{group_id}", headers=_auth(males[0][0]))
    assert group_detail_resp.status_code == 200
    group_detail = group_detail_resp.json()
    assert group_detail["chat_room_id"] is not None
    group_chat_room_id = group_detail["chat_room_id"]

    # ── 9. Get group detail — verify public profiles, no private prefs ──
    for member in group_detail["members"]:
        profile = member["profile"]
        assert "first_name" in profile
        assert "bio" in profile
        # Private preferences must NOT be exposed
        assert "age_range_min" not in profile
        assert "age_range_max" not in profile

    # ── 10. Get icebreakers — verify 3 returned ──
    ice_resp = await client.get(f"/api/groups/{group_id}/icebreakers", headers=_auth(males[0][0]))
    assert ice_resp.status_code == 200
    assert len(ice_resp.json()["prompts"]) == 3

    # ── 11. Get venue suggestions — verify bowling venues returned ──
    venue_resp = await client.get(f"/api/groups/{group_id}/venues", headers=_auth(males[0][0]))
    assert venue_resp.status_code == 200
    venue_data = venue_resp.json()
    assert venue_data["activity"] == "bowling"
    assert len(venue_data["venues"]) > 0

    # ── 12. Submit feedback for all 6 members ──
    # M1 (idx 0) interested in F1 (idx 3) and F2 (idx 4)
    # F1 (idx 3) interested in M1 (idx 0) — mutual with M1
    # F2 (idx 4) interested in M2 (idx 1) — NOT mutual with M1
    # M2 (idx 1) interested in F2 (idx 4) — mutual with F2
    # M3 (idx 2) blocks F3 (idx 5)
    # F3 (idx 5) not interested in anyone

    for idx, (token, info) in enumerate(all_users):
        other_ids = [u_info["id"] for j, (_, u_info) in enumerate(all_users) if j != idx]

        if idx == 0:  # M1 interested in F1, F2
            interested = [all_users[3][1]["id"], all_users[4][1]["id"]]
            payload = _feedback_payload(other_ids, interested_ids=interested)
        elif idx == 1:  # M2 interested in F2
            interested = [all_users[4][1]["id"]]
            payload = _feedback_payload(other_ids, interested_ids=interested)
        elif idx == 2:  # M3 blocks F3
            payload = _feedback_payload(other_ids, block_ids=[all_users[5][1]["id"]])
        elif idx == 3:  # F1 interested in M1
            interested = [all_users[0][1]["id"]]
            payload = _feedback_payload(other_ids, interested_ids=interested)
        elif idx == 4:  # F2 interested in M2
            interested = [all_users[1][1]["id"]]
            payload = _feedback_payload(other_ids, interested_ids=interested)
        else:  # F3 not interested in anyone
            payload = _feedback_payload(other_ids)

        resp = await client.post(
            f"/api/groups/{group_id}/feedback",
            json=payload,
            headers=_auth(token),
        )
        assert resp.status_code == 201, f"Feedback failed for user idx {idx}: {resp.text}"

    # ── 13. Verify: Match created for M1-F1 (mutual) and M2-F2 (mutual) ──
    result = await db_session.execute(
        select(Match).where(Match.group_id == uuid.UUID(group_id))
    )
    matches = list(result.scalars().all())
    assert len(matches) == 2

    match_pairs = {frozenset({str(m.user1_id), str(m.user2_id)}) for m in matches}
    m1_f1 = frozenset({all_users[0][1]["id"], all_users[3][1]["id"]})
    m2_f2 = frozenset({all_users[1][1]["id"], all_users[4][1]["id"]})
    assert m1_f1 in match_pairs
    assert m2_f2 in match_pairs

    # ── 14. Verify: No match for M1-F2 (one-sided) ──
    m1_f2 = frozenset({all_users[0][1]["id"], all_users[4][1]["id"]})
    assert m1_f2 not in match_pairs

    # ── 15. Verify: BlockedPair created for M3-F3 ──
    m3_id = uuid.UUID(all_users[2][1]["id"])
    f3_id = uuid.UUID(all_users[5][1]["id"])
    result = await db_session.execute(
        select(BlockedPair).where(
            BlockedPair.blocker_id == m3_id,
            BlockedPair.blocked_id == f3_id,
        )
    )
    assert result.scalar_one_or_none() is not None

    # ── 16. Verify: 1-on-1 chat rooms created for both matches ──
    for match in matches:
        assert match.chat_room_id is not None
        result = await db_session.execute(
            select(ChatRoom).where(ChatRoom.id == match.chat_room_id)
        )
        chat_room = result.scalar_one()
        assert chat_room.room_type == "direct"

    # ── 17. Get matches as M1 — verify F1 is a partner with chat_room_id ──
    matches_resp = await client.get("/api/matches", headers=_auth(males[0][0]))
    assert matches_resp.status_code == 200
    matches_data = matches_resp.json()
    assert len(matches_data) == 1  # M1 matched only with F1
    assert matches_data[0]["partner"]["id"] == all_users[3][1]["id"]
    assert matches_data[0]["chat_room_id"] is not None

    # ── 18. List chat rooms as M1 — verify both group chat and direct chat appear ──
    rooms_resp = await client.get("/api/chat/rooms", headers=_auth(males[0][0]))
    assert rooms_resp.status_code == 200
    rooms = rooms_resp.json()
    room_types = {r["room_type"] for r in rooms}
    assert "group" in room_types
    assert "direct" in room_types
    assert len(rooms) == 2  # 1 group + 1 direct


# ──────────────── Pre-group Flow ────────────────


async def test_pregroup_flow(client: AsyncClient, db_session: AsyncSession):
    """
    M1 creates a date request with M2 as pre-grouped friend.
    After matching, M1 and M2 must be in the same group.
    """

    # 1. Register 4 users (2M, 2F)
    m1_token, m1_info = await _register_and_login(client, gender="male", suffix=f"pg1{uuid.uuid4().hex[:4]}")
    m2_token, m2_info = await _register_and_login(client, gender="male", suffix=f"pg2{uuid.uuid4().hex[:4]}")
    f1_token, f1_info = await _register_and_login(client, gender="female", suffix=f"pg3{uuid.uuid4().hex[:4]}")
    f2_token, f2_info = await _register_and_login(client, gender="female", suffix=f"pg4{uuid.uuid4().hex[:4]}")

    # Create profiles
    for token in [m1_token, m2_token, f1_token, f2_token]:
        await _create_profile(client, token)

    # 2. M1 creates date request with M2 as pre-grouped friend
    await _create_date_request(client, m1_token, group_size=4, pre_group_friend_ids=[m2_info["id"]])

    # 3. M2, F1, F2 create separate requests
    await _create_date_request(client, m2_token, group_size=4)
    await _create_date_request(client, f1_token, group_size=4)
    await _create_date_request(client, f2_token, group_size=4)

    # 4. Run batch matching
    groups = await run_batch_matching(db_session)

    # 5. Verify: M1 and M2 are in the same group
    assert len(groups) == 1
    member_ids = {str(m.user_id) for m in groups[0].members}
    assert m1_info["id"] in member_ids
    assert m2_info["id"] in member_ids


# ──────────────── Block Prevents Future Matching ────────────────


async def test_block_prevents_future_matching(client: AsyncClient, db_session: AsyncSession):
    """
    After M1 blocks F1 via feedback, they must NOT end up in the same group
    in a future matching round.
    """

    # 1. Create first group: 2M + 2F, run matching
    users_round1: list[tuple[str, dict]] = []
    for gender in ["male", "male", "female", "female"]:
        token, info = await _register_and_login(client, gender=gender, suffix=f"blk{uuid.uuid4().hex[:6]}")
        await _create_profile(client, token)
        await _create_date_request(client, token, group_size=4)
        users_round1.append((token, info))

    groups = await run_batch_matching(db_session)
    assert len(groups) == 1
    group_id = str(groups[0].id)

    # 2. After date, M1 blocks F1 — submit feedback for all 4
    m1_token, m1_info = users_round1[0]
    f1_token, f1_info = users_round1[2]

    for idx, (token, info) in enumerate(users_round1):
        other_ids = [u_info["id"] for j, (_, u_info) in enumerate(users_round1) if j != idx]
        if idx == 0:  # M1 blocks F1
            payload = _feedback_payload(other_ids, block_ids=[f1_info["id"]])
        else:
            payload = _feedback_payload(other_ids)

        resp = await client.post(
            f"/api/groups/{group_id}/feedback",
            json=payload,
            headers=_auth(token),
        )
        assert resp.status_code == 201, resp.text

    # Verify block was created
    result = await db_session.execute(
        select(BlockedPair).where(
            BlockedPair.blocker_id == uuid.UUID(m1_info["id"]),
            BlockedPair.blocked_id == uuid.UUID(f1_info["id"]),
        )
    )
    assert result.scalar_one_or_none() is not None

    # 3. Both M1 and F1 create new date requests (plus 1 extra M and F to form a group)
    await _create_date_request(client, m1_token, activity="karaoke", group_size=4)
    await _create_date_request(client, f1_token, activity="karaoke", group_size=4)

    # Need more users for a valid group
    extra_m_token, extra_m_info = await _register_and_login(client, gender="male", suffix=f"blkx{uuid.uuid4().hex[:4]}")
    await _create_profile(client, extra_m_token)
    await _create_date_request(client, extra_m_token, activity="karaoke", group_size=4)

    extra_f_token, extra_f_info = await _register_and_login(client, gender="female", suffix=f"blky{uuid.uuid4().hex[:4]}")
    await _create_profile(client, extra_f_token)
    await _create_date_request(client, extra_f_token, activity="karaoke", group_size=4)

    # 4. Run batch matching
    groups2 = await run_batch_matching(db_session)

    # 5. Verify: M1 and F1 are NOT in the same group
    for group in groups2:
        member_ids = {str(m.user_id) for m in group.members}
        assert not (m1_info["id"] in member_ids and f1_info["id"] in member_ids), \
            "Blocked pair M1 and F1 should never be in the same group!"
