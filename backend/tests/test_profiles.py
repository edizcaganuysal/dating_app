import pytest
from httpx import AsyncClient

from tests.conftest import create_verified_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

PROFILE_DATA = {
    "bio": "Hello, I love hiking!",
    "program": "Computer Science",
    "year_of_study": 3,
    "photo_urls": ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"],
    "interests": ["hiking", "coding", "music"],
    "vibe_answers": [
        {"question": f"Q{i}", "answer": f"A{i}"} for i in range(5)
    ],
    "age_range_min": 19,
    "age_range_max": 25,
}


async def test_create_profile(client: AsyncClient):
    token, _ = await create_verified_user(client, "cp")
    resp = await client.post(
        "/api/profiles",
        json=PROFILE_DATA,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["bio"] == "Hello, I love hiking!"
    assert data["program"] == "Computer Science"
    assert data["age_range_min"] == 19
    assert data["age_range_max"] == 25


async def test_create_profile_min_photos(client: AsyncClient):
    token, _ = await create_verified_user(client, "mp")
    bad_data = {**PROFILE_DATA, "photo_urls": ["https://example.com/1.jpg", "https://example.com/2.jpg"]}
    resp = await client.post(
        "/api/profiles",
        json=bad_data,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


async def test_get_own_profile(client: AsyncClient):
    token, _ = await create_verified_user(client, "gop")
    await client.post(
        "/api/profiles",
        json=PROFILE_DATA,
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "age_range_min" in data
    assert "age_range_max" in data
    assert "attractiveness_score" not in data
    assert "elo_score" not in data


async def test_get_other_profile_public(client: AsyncClient):
    token_a, _ = await create_verified_user(client, "puba")
    token_b, _ = await create_verified_user(client, "pubb")

    await client.post(
        "/api/profiles",
        json=PROFILE_DATA,
        headers={"Authorization": f"Bearer {token_b}"},
    )

    # Get user B's id
    me_resp = await client.get("/api/profiles/me", headers={"Authorization": f"Bearer {token_b}"})
    user_b_id = me_resp.json()["id"]

    resp = await client.get(
        f"/api/profiles/{user_b_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "age_range_min" not in data
    assert "age_range_max" not in data
    assert "attractiveness_score" not in data
    assert "elo_score" not in data
    assert "bio" in data


async def test_update_profile(client: AsyncClient):
    token, _ = await create_verified_user(client, "up")
    await client.post(
        "/api/profiles",
        json=PROFILE_DATA,
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.patch(
        "/api/profiles/me",
        json={"bio": "Updated bio"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["bio"] == "Updated bio"
    assert data["program"] == "Computer Science"  # unchanged


async def test_selfie_verify(client: AsyncClient):
    token, _ = await create_verified_user(client, "sv")
    resp = await client.post(
        "/api/profiles/selfie-verify",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Selfie verified"

    me = await client.get("/api/profiles/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["is_selfie_verified"] is True


async def test_profile_unauthorized(client: AsyncClient):
    assert (await client.post("/api/profiles", json=PROFILE_DATA)).status_code == 403
    assert (await client.get("/api/profiles/me")).status_code == 403
    assert (await client.patch("/api/profiles/me", json={"bio": "x"})).status_code == 403
    assert (await client.post("/api/profiles/selfie-verify")).status_code == 403
