import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, DateRequest


async def test_tables_created(db_session: AsyncSession):
    """All tables should be created by the setup_database fixture."""
    from app.database import Base

    table_names = list(Base.metadata.tables.keys())
    expected = [
        "users", "vibe_answers", "date_requests", "availability_slots",
        "pre_group_friends", "date_groups", "group_members", "chat_rooms",
        "chat_participants", "chat_messages", "matches", "feedback_ratings",
        "romantic_interests", "blocked_pairs", "reports",
    ]
    for name in expected:
        assert name in table_names, f"Table '{name}' not found in metadata"


async def test_create_and_read_user(db_session: AsyncSession):
    user = User(
        email="test@utoronto.ca",
        password_hash="hashed_pw",
        first_name="Jane",
        last_name="Doe",
        university_domain="utoronto.ca",
        gender="female",
        age=21,
    )
    db_session.add(user)
    await db_session.commit()

    result = await db_session.execute(select(User).where(User.email == "test@utoronto.ca"))
    fetched = result.scalar_one()

    assert fetched.first_name == "Jane"
    assert fetched.last_name == "Doe"
    assert fetched.gender == "female"
    assert fetched.age == 21
    assert fetched.is_email_verified is False
    assert fetched.elo_score == 1000.0
    assert isinstance(fetched.id, uuid.UUID)


async def test_create_date_request_linked_to_user(db_session: AsyncSession):
    user = User(
        email="requester@utoronto.ca",
        password_hash="hashed_pw",
        first_name="John",
        last_name="Smith",
        university_domain="utoronto.ca",
        gender="male",
        age=22,
    )
    db_session.add(user)
    await db_session.commit()

    date_req = DateRequest(
        user_id=user.id,
        group_size=4,
        activity="coffee",
    )
    db_session.add(date_req)
    await db_session.commit()

    result = await db_session.execute(select(DateRequest).where(DateRequest.user_id == user.id))
    fetched = result.scalar_one()

    assert fetched.group_size == 4
    assert fetched.activity == "coffee"
    assert fetched.status == "pending"
    assert fetched.user_id == user.id
