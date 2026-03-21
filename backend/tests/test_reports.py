import datetime as dt
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import DateGroup, GroupMember
from app.models.report import FeedbackRating, Report
from app.models.user import User
from tests.conftest import create_verified_user

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _make_admin(db: AsyncSession, user_id: uuid.UUID):
    """Promote a user to admin."""
    await db.execute(update(User).where(User.id == user_id).values(is_admin=True))
    await db.commit()


async def _get_user_id(client: AsyncClient, token: str) -> uuid.UUID:
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    return uuid.UUID(resp.json()["id"])


async def _create_completed_group(
    db: AsyncSession,
    user_ids: list[uuid.UUID],
    *,
    days_ago: int = 5,
) -> DateGroup:
    """Create a completed DateGroup with the given users as members, scheduled in the past."""
    group = DateGroup(
        activity="karaoke",
        scheduled_date=dt.date.today() - dt.timedelta(days=days_ago),
        scheduled_time="evening",
        status="completed",
    )
    db.add(group)
    await db.flush()
    for uid in user_ids:
        db.add(GroupMember(group_id=group.id, user_id=uid))
    await db.commit()
    await db.refresh(group)
    return group


# ──────────────────────── Tests ────────────────────────


async def test_create_report(client: AsyncClient, db_session: AsyncSession):
    """Report a user, expect 201."""
    token1, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    token2, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    reported_id = await _get_user_id(client, token2)

    resp = await client.post(
        "/api/reports",
        json={
            "reported_user_id": str(reported_id),
            "category": "harassment",
            "description": "Sent inappropriate messages",
        },
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["category"] == "harassment"
    assert data["reported_id"] == str(reported_id)
    assert data["status"] == "pending"


async def test_admin_list_reports(client: AsyncClient, db_session: AsyncSession):
    """Admin sees reports, non-admin gets 403."""
    token1, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    token2, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    admin_token, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    admin_id = await _get_user_id(client, admin_token)
    await _make_admin(db_session, admin_id)

    reported_id = await _get_user_id(client, token2)

    # Create a report
    await client.post(
        "/api/reports",
        json={"reported_user_id": str(reported_id), "category": "spam"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    # Non-admin should get 403
    resp = await client.get(
        "/api/admin/reports",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 403

    # Admin should see reports
    resp = await client.get(
        "/api/admin/reports",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


async def test_admin_resolve_report(client: AsyncClient, db_session: AsyncSession):
    """Admin updates report status to resolved with notes."""
    token1, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    token2, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    admin_token, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    admin_id = await _get_user_id(client, admin_token)
    await _make_admin(db_session, admin_id)

    reported_id = await _get_user_id(client, token2)

    create_resp = await client.post(
        "/api/reports",
        json={"reported_user_id": str(reported_id), "category": "harassment"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    report_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/api/admin/reports/{report_id}",
        json={"status": "resolved", "admin_notes": "Warned the user"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "resolved"
    assert data["admin_notes"] == "Warned the user"


async def test_noshow_detection(client: AsyncClient, db_session: AsyncSession):
    """Create a completed group where one member hasn't submitted feedback.
    Run check_noshows. Verify that user's no_show_count incremented."""
    token1, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    token2, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    admin_token, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])

    uid1 = await _get_user_id(client, token1)
    uid2 = await _get_user_id(client, token2)
    admin_id = await _get_user_id(client, admin_token)
    await _make_admin(db_session, admin_id)

    # Create a completed group in the past (> 48h ago)
    group = await _create_completed_group(db_session, [uid1, uid2], days_ago=5)

    # uid1 submits feedback, uid2 does NOT
    feedback = FeedbackRating(
        group_id=group.id,
        user_id=uid1,
        experience_rating=4,
    )
    db_session.add(feedback)
    await db_session.commit()

    # Trigger no-show check via admin endpoint
    resp = await client.post(
        "/api/admin/noshow-check",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    flagged = resp.json()
    flagged_ids = [u["id"] for u in flagged]
    assert str(uid2) in flagged_ids

    # Verify no_show_count incremented
    result = await db_session.execute(select(User).where(User.id == uid2))
    user2 = result.scalar_one()
    assert user2.no_show_count >= 1


async def test_three_noshows_suspends(client: AsyncClient, db_session: AsyncSession):
    """User with no_show_count=2, trigger one more no-show, verify is_suspended=True."""
    token1, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])
    admin_token, _ = await create_verified_user(client, suffix=uuid.uuid4().hex[:8])

    uid1 = await _get_user_id(client, token1)
    admin_id = await _get_user_id(client, admin_token)
    await _make_admin(db_session, admin_id)

    # Set user's no_show_count to 2
    await db_session.execute(
        update(User).where(User.id == uid1).values(no_show_count=2)
    )
    await db_session.commit()

    # Create a completed group in the past where user hasn't submitted feedback
    group = await _create_completed_group(db_session, [uid1], days_ago=5)

    # Trigger no-show check
    resp = await client.post(
        "/api/admin/noshow-check",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    flagged = resp.json()
    suspended = [u for u in flagged if u["id"] == str(uid1)]
    assert len(suspended) == 1
    assert suspended[0]["no_show_count"] == 3
    assert suspended[0]["is_suspended"] is True

    # Verify in DB
    result = await db_session.execute(select(User).where(User.id == uid1))
    user = result.scalar_one()
    assert user.is_suspended is True


async def test_suspended_user_cannot_login(client: AsyncClient, db_session: AsyncSession):
    """Suspended user tries to login, expect 403."""
    unique = uuid.uuid4().hex[:8]
    email = f"suspended{unique}@utoronto.ca"
    password = "TestPassword123!"

    reg_resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "first_name": f"Susp{unique}",
        "last_name": "User",
        "phone": "1234567890",
        "gender": "male",
        "age": 21,
    })
    otp = reg_resp.json()["otp"]
    await client.post("/api/auth/verify-email", json={"email": email, "otp": otp})

    # Suspend the user
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    await db_session.execute(
        update(User).where(User.id == user.id).values(is_suspended=True)
    )
    await db_session.commit()

    # Try to login
    resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 403
    assert "suspended" in resp.json()["detail"].lower()
