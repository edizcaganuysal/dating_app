import pytest


REGISTER_URL = "/api/auth/register"
VERIFY_URL = "/api/auth/verify-email"
LOGIN_URL = "/api/auth/login"
ME_URL = "/api/auth/me"

VALID_USER = {
    "email": "test@mail.utoronto.ca",
    "password": "securepass123",
    "first_name": "Test",
    "last_name": "User",
    "phone": "4161234567",
    "gender": "male",
    "age": 21,
}


async def register_user(client, user_data=None):
    data = user_data or VALID_USER
    return await client.post(REGISTER_URL, json=data)


async def register_and_verify(client, user_data=None):
    data = user_data or VALID_USER
    reg_resp = await client.post(REGISTER_URL, json=data)
    otp = reg_resp.json()["otp"]
    await client.post(VERIFY_URL, json={"email": data["email"], "otp": otp})
    return reg_resp


async def register_verify_login(client, user_data=None):
    data = user_data or VALID_USER
    await register_and_verify(client, data)
    login_resp = await client.post(LOGIN_URL, json={"email": data["email"], "password": data["password"]})
    return login_resp


@pytest.mark.asyncio(loop_scope="session")
async def test_register_valid_edu_email(client):
    resp = await register_user(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["message"] == "Registration successful. Check your email for OTP."
    assert "otp" in body


@pytest.mark.asyncio(loop_scope="session")
async def test_register_invalid_email_domain(client):
    data = {**VALID_USER, "email": "test@gmail.com"}
    resp = await client.post(REGISTER_URL, json=data)
    assert resp.status_code == 400
    assert "university email" in resp.json()["detail"].lower()


@pytest.mark.asyncio(loop_scope="session")
async def test_register_duplicate_email(client):
    await register_user(client)
    resp = await register_user(client)
    assert resp.status_code == 409
    assert "already registered" in resp.json()["detail"].lower()


@pytest.mark.asyncio(loop_scope="session")
async def test_verify_email_correct_otp(client):
    reg_resp = await register_user(client)
    otp = reg_resp.json()["otp"]
    resp = await client.post(VERIFY_URL, json={"email": VALID_USER["email"], "otp": otp})
    assert resp.status_code == 200
    assert resp.json()["message"] == "Email verified"


@pytest.mark.asyncio(loop_scope="session")
async def test_verify_email_wrong_otp(client):
    await register_user(client)
    resp = await client.post(VERIFY_URL, json={"email": VALID_USER["email"], "otp": "000000"})
    assert resp.status_code == 400


@pytest.mark.asyncio(loop_scope="session")
async def test_login_success(client):
    resp = await register_verify_login(client)
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio(loop_scope="session")
async def test_login_unverified(client):
    await register_user(client)
    resp = await client.post(LOGIN_URL, json={"email": VALID_USER["email"], "password": VALID_USER["password"]})
    assert resp.status_code == 400
    assert "verify your email" in resp.json()["detail"].lower()


@pytest.mark.asyncio(loop_scope="session")
async def test_login_wrong_password(client):
    await register_and_verify(client)
    resp = await client.post(LOGIN_URL, json={"email": VALID_USER["email"], "password": "wrongpassword"})
    assert resp.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_me_with_token(client):
    login_resp = await register_verify_login(client)
    token = login_resp.json()["access_token"]
    resp = await client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == VALID_USER["email"]
    assert body["first_name"] == VALID_USER["first_name"]
    assert body["is_email_verified"] is True


@pytest.mark.asyncio(loop_scope="session")
async def test_me_without_token(client):
    resp = await client.get(ME_URL)
    assert resp.status_code in (401, 403)
