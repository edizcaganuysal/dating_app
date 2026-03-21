import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import create_verified_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

AVAILABILITY_SLOTS = [
    {"date": "2026-04-01", "time_window": "evening"},
    {"date": "2026-04-02", "time_window": "afternoon"},
]


async def create_female_user(client: AsyncClient, suffix: str) -> tuple[str, dict]:
    """Register a female verified user."""
    unique = suffix
    email = f"test{unique}@utoronto.ca"
    password = "TestPassword123!"

    reg_resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "first_name": f"Test{unique}",
        "last_name": "User",
        "phone": "1234567890",
        "gender": "female",
        "age": 21,
    })
    otp = reg_resp.json()["otp"]
    await client.post("/api/auth/verify-email", json={"email": email, "otp": otp})
    login_resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    token = login_resp.json()["access_token"]
    return token, {"email": email, "first_name": f"Test{unique}"}


async def get_user_id(client: AsyncClient, token: str) -> str:
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    return resp.json()["id"]


async def test_create_date_request(client: AsyncClient):
    token, _ = await create_verified_user(client, "dr1")
    resp = await client.post(
        "/api/date-requests",
        json={
            "group_size": 4,
            "activity": "bowling",
            "availability_slots": AVAILABILITY_SLOTS,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["group_size"] == 4
    assert data["activity"] == "bowling"
    assert data["status"] == "pending"
    assert len(data["availability_slots"]) == 2
    assert data["pre_group_friend_ids"] == []


async def test_create_invalid_group_size(client: AsyncClient):
    token, _ = await create_verified_user(client, "dr2")
    resp = await client.post(
        "/api/date-requests",
        json={
            "group_size": 5,
            "activity": "bowling",
            "availability_slots": AVAILABILITY_SLOTS,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


async def test_create_with_valid_friend(client: AsyncClient):
    token_a, _ = await create_verified_user(client, "dr3a")
    token_b, _ = await create_verified_user(client, "dr3b")
    friend_id = await get_user_id(client, token_b)

    resp = await client.post(
        "/api/date-requests",
        json={
            "group_size": 4,
            "activity": "karaoke",
            "availability_slots": AVAILABILITY_SLOTS,
            "pre_group_friend_ids": [friend_id],
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 201
    assert resp.json()["pre_group_friend_ids"] == [friend_id]


async def test_create_with_wrong_gender_friend(client: AsyncClient):
    token_a, _ = await create_verified_user(client, "dr4a")  # male
    token_b, _ = await create_female_user(client, "dr4b")  # female
    friend_id = await get_user_id(client, token_b)

    resp = await client.post(
        "/api/date-requests",
        json={
            "group_size": 4,
            "activity": "dinner",
            "availability_slots": AVAILABILITY_SLOTS,
            "pre_group_friend_ids": [friend_id],
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 400
    assert "same gender" in resp.json()["detail"].lower()


async def test_create_with_too_many_friends(client: AsyncClient):
    token_a, _ = await create_verified_user(client, "dr5a")
    token_b, _ = await create_verified_user(client, "dr5b")
    token_c, _ = await create_verified_user(client, "dr5c")
    friend_b_id = await get_user_id(client, token_b)
    friend_c_id = await get_user_id(client, token_c)

    # group_size=4 allows max 1 friend (requester + 1 = 2 = half of 4)
    resp = await client.post(
        "/api/date-requests",
        json={
            "group_size": 4,
            "activity": "hiking",
            "availability_slots": AVAILABILITY_SLOTS,
            "pre_group_friend_ids": [friend_b_id, friend_c_id],
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 400
    assert "at most" in resp.json()["detail"].lower()


async def test_create_duplicate_pending(client: AsyncClient):
    token, _ = await create_verified_user(client, "dr6")
    resp1 = await client.post(
        "/api/date-requests",
        json={
            "group_size": 4,
            "activity": "bowling",
            "availability_slots": AVAILABILITY_SLOTS,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 201

    resp2 = await client.post(
        "/api/date-requests",
        json={
            "group_size": 6,
            "activity": "dinner",
            "availability_slots": AVAILABILITY_SLOTS,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 409


async def test_list_own_requests(client: AsyncClient):
    token, _ = await create_verified_user(client, "dr7")
    await client.post(
        "/api/date-requests",
        json={
            "group_size": 6,
            "activity": "trivia_night",
            "availability_slots": AVAILABILITY_SLOTS,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get(
        "/api/date-requests",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["activity"] == "trivia_night"


async def test_cancel_request(client: AsyncClient):
    token, _ = await create_verified_user(client, "dr8")
    create_resp = await client.post(
        "/api/date-requests",
        json={
            "group_size": 4,
            "activity": "mini_golf",
            "availability_slots": AVAILABILITY_SLOTS,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    request_id = create_resp.json()["id"]

    del_resp = await client.delete(
        f"/api/date-requests/{request_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_resp.status_code == 200

    # Verify status changed
    get_resp = await client.get(
        f"/api/date-requests/{request_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_resp.json()["status"] == "cancelled"


async def test_cancel_others_request(client: AsyncClient):
    token_a, _ = await create_verified_user(client, "dr9a")
    token_b, _ = await create_verified_user(client, "dr9b")

    create_resp = await client.post(
        "/api/date-requests",
        json={
            "group_size": 4,
            "activity": "escape_room",
            "availability_slots": AVAILABILITY_SLOTS,
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    request_id = create_resp.json()["id"]

    del_resp = await client.delete(
        f"/api/date-requests/{request_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert del_resp.status_code == 403
