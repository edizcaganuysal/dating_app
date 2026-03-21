import datetime as dt
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatRoom
from app.models.date_request import DateRequest
from app.models.group import DateGroup, GroupMember
from app.models.match import Match
from app.models.report import FeedbackRating, Report
from app.models.user import User
from tests.conftest import create_verified_user

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _make_admin(db: AsyncSession, user_id: uuid.UUID):
    await db.execute(update(User).where(User.id == user_id).values(is_admin=True))
    await db.commit()


async def _get_user_id(client: AsyncClient, token: str) -> uuid.UUID:
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    return uuid.UUID(resp.json()["id"])


async def _create_user(client: AsyncClient, gender: str = "male", suffix: str = "") -> tuple[str, uuid.UUID]:
    """Create a verified user and return (token, user_id)."""
    unique = suffix or uuid.uuid4().hex[:8]
    email = f"adm{unique}@utoronto.ca"
    password = "TestPassword123!"

    reg_resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "first_name": f"User{unique}",
        "last_name": "Test",
        "phone": "1234567890",
        "gender": gender,
        "age": 21,
    })
    otp = reg_resp.json()["otp"]
    await client.post("/api/auth/verify-email", json={"email": email, "otp": otp})
    login_resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    token = login_resp.json()["access_token"]
    uid = await _get_user_id(client, token)
    return token, uid


async def _setup_admin(client: AsyncClient, db: AsyncSession) -> str:
    """Create and return an admin token."""
    token, uid = await _create_user(client)
    await _make_admin(db, uid)
    return token


# ──────────────────────── Tests ────────────────────────


async def test_admin_list_users(client: AsyncClient, db_session: AsyncSession):
    """Admin can list users with pagination."""
    admin_token = await _setup_admin(client, db_session)

    # Create a few extra users
    for _ in range(3):
        await _create_user(client)

    resp = await client.get(
        "/api/admin/users?limit=2&offset=0",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "users" in data
    assert "total" in data
    assert len(data["users"]) <= 2
    assert data["total"] >= 4  # admin + 3 users


async def test_admin_search_users(client: AsyncClient, db_session: AsyncSession):
    """Search by name returns matching users."""
    admin_token = await _setup_admin(client, db_session)

    # Create a user with a unique name
    unique = uuid.uuid4().hex[:8]
    email = f"searchable{unique}@utoronto.ca"
    reg_resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": "TestPassword123!",
        "first_name": f"Searchable{unique}",
        "last_name": "Person",
        "phone": "1234567890",
        "gender": "female",
        "age": 22,
    })
    otp = reg_resp.json()["otp"]
    await client.post("/api/auth/verify-email", json={"email": email, "otp": otp})

    resp = await client.get(
        f"/api/admin/users?search=Searchable{unique}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    names = [u["first_name"] for u in data["users"]]
    assert any(f"Searchable{unique}" in n for n in names)


async def test_admin_user_detail(client: AsyncClient, db_session: AsyncSession):
    """Admin gets detailed user info."""
    admin_token = await _setup_admin(client, db_session)
    _, target_uid = await _create_user(client)

    resp = await client.get(
        f"/api/admin/users/{target_uid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(target_uid)
    assert "groups" in data
    assert "matches" in data
    assert "reports" in data
    assert "email" in data
    assert "gender" in data


async def test_non_admin_rejected(client: AsyncClient, db_session: AsyncSession):
    """Non-admin gets 403 on all admin endpoints."""
    token, uid = await _create_user(client)

    endpoints = [
        ("GET", "/api/admin/users"),
        ("GET", f"/api/admin/users/{uid}"),
        ("PATCH", f"/api/admin/users/{uid}"),
        ("GET", "/api/admin/date-requests/pending"),
        ("GET", "/api/admin/analytics"),
    ]
    for method, url in endpoints:
        if method == "GET":
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        else:
            resp = await client.patch(
                url,
                json={"is_suspended": True},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 403, f"{method} {url} should return 403 for non-admin"


async def test_admin_suspend_user(client: AsyncClient, db_session: AsyncSession):
    """Admin suspends a user, verify is_suspended=True."""
    admin_token = await _setup_admin(client, db_session)
    _, target_uid = await _create_user(client)

    resp = await client.patch(
        f"/api/admin/users/{target_uid}",
        json={"is_suspended": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["is_suspended"] is True

    # Verify in DB
    result = await db_session.execute(select(User).where(User.id == target_uid))
    user = result.scalar_one()
    assert user.is_suspended is True


async def test_admin_unsuspend_user(client: AsyncClient, db_session: AsyncSession):
    """Admin unsuspends a user, verify is_suspended=False."""
    admin_token = await _setup_admin(client, db_session)
    _, target_uid = await _create_user(client)

    # First suspend
    await client.patch(
        f"/api/admin/users/{target_uid}",
        json={"is_suspended": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Then unsuspend
    resp = await client.patch(
        f"/api/admin/users/{target_uid}",
        json={"is_suspended": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["is_suspended"] is False

    result = await db_session.execute(select(User).where(User.id == target_uid))
    user = result.scalar_one()
    assert user.is_suspended is False


async def test_admin_manual_group(client: AsyncClient, db_session: AsyncSession):
    """Admin creates a group from 4 users (2M+2F), verify group created with chat room."""
    admin_token = await _setup_admin(client, db_session)

    # Create 2 male + 2 female users
    _, m1 = await _create_user(client, gender="male")
    _, m2 = await _create_user(client, gender="male")
    _, f1 = await _create_user(client, gender="female")
    _, f2 = await _create_user(client, gender="female")

    resp = await client.post(
        "/api/admin/matching/manual",
        json={
            "user_ids": [str(m1), str(m2), str(f1), str(f2)],
            "activity": "board_games",
            "scheduled_date": "2026-04-01",
            "scheduled_time": "evening",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert len(data["members"]) == 4
    assert data["activity"] == "board_games"
    assert data["status"] == "upcoming"

    # Verify chat room was created
    group_id = uuid.UUID(data["id"])
    room_result = await db_session.execute(
        select(ChatRoom).where(ChatRoom.group_id == group_id)
    )
    chat_room = room_result.scalar_one_or_none()
    assert chat_room is not None
    assert chat_room.room_type == "group"


async def test_admin_manual_group_wrong_gender_split(client: AsyncClient, db_session: AsyncSession):
    """3M+1F, expect 400."""
    admin_token = await _setup_admin(client, db_session)

    _, m1 = await _create_user(client, gender="male")
    _, m2 = await _create_user(client, gender="male")
    _, m3 = await _create_user(client, gender="male")
    _, f1 = await _create_user(client, gender="female")

    resp = await client.post(
        "/api/admin/matching/manual",
        json={
            "user_ids": [str(m1), str(m2), str(m3), str(f1)],
            "activity": "karaoke",
            "scheduled_date": "2026-04-01",
            "scheduled_time": "evening",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400
    assert "gender split" in resp.json()["detail"].lower()


async def test_admin_pending_requests(client: AsyncClient, db_session: AsyncSession):
    """Create pending requests, admin endpoint returns them."""
    admin_token = await _setup_admin(client, db_session)
    user_token, user_uid = await _create_user(client)

    # Create a date request
    await client.post(
        "/api/date-requests",
        json={
            "group_size": 4,
            "activity": "karaoke",
            "availability_slots": [
                {"date": "2026-04-15", "time_window": "evening"},
            ],
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )

    resp = await client.get(
        "/api/admin/date-requests/pending",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    # Verify user info is included
    req = next((r for r in data if r["user_id"] == str(user_uid)), None)
    assert req is not None
    assert "user" in req
    assert req["user"]["first_name"] is not None
    assert req["user"]["gender"] is not None


async def test_admin_analytics(client: AsyncClient, db_session: AsyncSession):
    """Verify analytics endpoint returns correct structure and counts."""
    admin_token = await _setup_admin(client, db_session)

    resp = await client.get(
        "/api/admin/analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_users" in data
    assert "active_users" in data
    assert "total_groups" in data
    assert "total_matches" in data
    assert "avg_experience_rating" in data
    assert "total_reports_pending" in data
    assert "no_show_count_total" in data
    assert data["total_users"] >= 1  # At least the admin user
