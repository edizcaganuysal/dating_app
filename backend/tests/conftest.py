import uuid
from typing import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import *  # noqa: F401, F403 — register all models

test_engine = create_async_engine(settings.DATABASE_TEST_URL, echo=False, poolclass=NullPool)
test_async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True, loop_scope="session")
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture(autouse=True, loop_scope="session")
async def clean_tables():
    yield
    async with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(text(f"TRUNCATE TABLE {table.name} CASCADE"))


@pytest_asyncio.fixture(loop_scope="session")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    session = test_async_session()
    try:
        yield session
    finally:
        try:
            await session.close()
        except RuntimeError:
            pass  # Event loop mismatch during teardown (pytest-asyncio 0.24 + asyncpg)


@pytest_asyncio.fixture(loop_scope="session")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


async def create_verified_user(client: AsyncClient, suffix: str = "") -> tuple[str, dict]:
    """Register, verify, and login a test user. Returns (token, user_data)."""
    unique = suffix or uuid.uuid4().hex[:8]
    email = f"test{unique}@utoronto.ca"
    password = "TestPassword123!"

    reg_resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "first_name": f"Test{unique}",
        "last_name": "User",
        "phone": "1234567890",
        "gender": "male",
        "age": 21,
    })
    otp = reg_resp.json()["otp"]

    await client.post("/api/auth/verify-email", json={"email": email, "otp": otp})

    login_resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    token = login_resp.json()["access_token"]
    return token, {"email": email, "first_name": f"Test{unique}"}
