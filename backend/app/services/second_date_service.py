import uuid
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import DateGroup
from app.models.match import Match
from app.models.second_date import SecondDate
from app.models.user import User

ACTIVITY_SUGGESTIONS = {
    "escape_room": "board_games",
    "board_games": "escape_room",
    "cooking": "dinner",
    "dinner": "cooking",
    "trivia": "bar",
    "bar": "trivia",
    "hiking": "mini_golf",
    "mini_golf": "hiking",
}

DEFAULT_SUGGESTION = "coffee"


async def generate_suggestion(db: AsyncSession, match_id: uuid.UUID) -> SecondDate:
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise ValueError("Match not found")

    # Get group activity
    group_result = await db.execute(select(DateGroup).where(DateGroup.id == match.group_id))
    group = group_result.scalar_one_or_none()
    group_activity = group.activity.lower() if group else ""

    # Suggest related activity
    activity = ACTIVITY_SUGGESTIONS.get(group_activity, DEFAULT_SUGGESTION)

    # Get both users' shared interests for context
    u1_result = await db.execute(select(User).where(User.id == match.user1_id))
    u2_result = await db.execute(select(User).where(User.id == match.user2_id))
    user1 = u1_result.scalar_one_or_none()
    user2 = u2_result.scalar_one_or_none()

    if user1 and user2:
        shared = set(user1.interests or []) & set(user2.interests or [])
        # If they share an interest that maps to an activity, prefer that
        for interest in shared:
            if interest.lower() in ACTIVITY_SUGGESTIONS:
                activity = ACTIVITY_SUGGESTIONS[interest.lower()]
                break

    second_date = SecondDate(
        match_id=match_id,
        activity=activity,
        proposed_date=date.today() + timedelta(days=3),
        proposed_time="19:00",
        status="suggested",
    )
    db.add(second_date)
    await db.flush()
    return second_date


async def propose_date(
    db: AsyncSession, second_date_id: uuid.UUID, proposer_id: uuid.UUID
) -> SecondDate:
    result = await db.execute(select(SecondDate).where(SecondDate.id == second_date_id))
    sd = result.scalar_one_or_none()
    if not sd:
        raise ValueError("Second date suggestion not found")

    sd.status = "proposed"
    sd.proposer_id = proposer_id
    await db.flush()
    return sd


async def respond_to_date(
    db: AsyncSession, second_date_id: uuid.UUID, user_id: uuid.UUID, accepted: bool
) -> SecondDate:
    result = await db.execute(select(SecondDate).where(SecondDate.id == second_date_id))
    sd = result.scalar_one_or_none()
    if not sd:
        raise ValueError("Second date suggestion not found")

    sd.status = "accepted" if accepted else "declined"
    await db.flush()
    return sd


async def get_suggestions(db: AsyncSession, match_id: uuid.UUID) -> list[SecondDate]:
    result = await db.execute(
        select(SecondDate).where(SecondDate.match_id == match_id)
    )
    return list(result.scalars().all())
