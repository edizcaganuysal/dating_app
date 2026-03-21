import pytest
import pytest_asyncio
from sqlalchemy import func, select

from app.models.chat import ChatRoom
from app.models.group import DateGroup
from app.models.match import Match
from app.models.user import User
from app.seed import seed_database


@pytest_asyncio.fixture(loop_scope="session")
async def seeded_db(db_session):
    """Run seed_database and return the session."""
    await seed_database(session=db_session)
    return db_session


@pytest.mark.asyncio(loop_scope="session")
async def test_seed_creates_users(seeded_db):
    result = await seeded_db.execute(select(func.count()).select_from(User))
    assert result.scalar() == 20


@pytest.mark.asyncio(loop_scope="session")
async def test_seed_creates_admin(seeded_db):
    result = await seeded_db.execute(
        select(User).where(User.email == "admin@mail.utoronto.ca")
    )
    admin = result.scalar_one_or_none()
    assert admin is not None
    assert admin.is_admin is True
    assert admin.is_email_verified is True
    assert admin.is_selfie_verified is True


@pytest.mark.asyncio(loop_scope="session")
async def test_seed_creates_groups(seeded_db):
    result = await seeded_db.execute(select(func.count()).select_from(DateGroup))
    count = result.scalar()
    assert count >= 2


@pytest.mark.asyncio(loop_scope="session")
async def test_seed_creates_match(seeded_db):
    result = await seeded_db.execute(select(Match))
    matches = list(result.scalars().all())
    assert len(matches) >= 1

    match = matches[0]
    assert match.chat_room_id is not None

    chat_result = await seeded_db.execute(
        select(ChatRoom).where(ChatRoom.id == match.chat_room_id)
    )
    chat_room = chat_result.scalar_one_or_none()
    assert chat_room is not None
    assert chat_room.room_type == "direct"


@pytest.mark.asyncio(loop_scope="session")
async def test_seed_is_idempotent(seeded_db):
    # Call seed again — should be a no-op since admin already exists
    await seed_database(session=seeded_db)

    result = await seeded_db.execute(select(func.count()).select_from(User))
    assert result.scalar() == 20
