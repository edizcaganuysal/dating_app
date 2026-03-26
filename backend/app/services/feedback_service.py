import uuid
from datetime import datetime, timedelta
from itertools import combinations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatMessage, ChatParticipant, ChatRoom
from app.models.group import DateGroup
from app.models.match import Match
from app.models.report import RomanticInterest, SoftMatch
from app.models.user import User
from app.services.analytics_service import log_event
from app.services.chat_ai_service import YUNI_AI_USER_ID
from app.services.notification_service import notify_match

INTEREST_SCORES = {
    "not_interested": 0.0,
    "maybe": 0.25,
    "interested": 0.75,
    "very_interested": 1.0,
}

FULL_MATCH_LEVELS = {"interested", "very_interested"}


async def check_and_create_matches(
    group_id: uuid.UUID, db: AsyncSession
) -> list[Match]:
    """Process romantic interests: create full matches, soft matches, and update Elo scores."""
    result = await db.execute(
        select(RomanticInterest).where(RomanticInterest.group_id == group_id)
    )
    interests = list(result.scalars().all())

    # Build lookup: (from_user_id, to_user_id) -> interest_level
    interest_map: dict[tuple[uuid.UUID, uuid.UUID], str] = {}
    for ri in interests:
        interest_map[(ri.from_user_id, ri.to_user_id)] = ri.interest_level

    all_user_ids = {ri.from_user_id for ri in interests} | {ri.to_user_id for ri in interests}

    matches: list[Match] = []
    soft_match_pairs: set[tuple[uuid.UUID, uuid.UUID]] = set()

    for a, b in combinations(all_user_ids, 2):
        level_a = interest_map.get((a, b), "not_interested")
        level_b = interest_map.get((b, a), "not_interested")

        if level_a in FULL_MATCH_LEVELS and level_b in FULL_MATCH_LEVELS:
            # FULL MATCH: both interested or very_interested
            match = await _create_full_match(group_id, a, b, db)
            matches.append(match)

        elif level_a in FULL_MATCH_LEVELS and level_b == "maybe":
            # SOFT MATCH: a is interested, b is maybe
            await _create_soft_match(group_id, interested_user_id=a, maybe_user_id=b, db=db)
            soft_match_pairs.add((a, b))

        elif level_b in FULL_MATCH_LEVELS and level_a == "maybe":
            # SOFT MATCH: b is interested, a is maybe
            await _create_soft_match(group_id, interested_user_id=b, maybe_user_id=a, db=db)
            soft_match_pairs.add((b, a))

    # Update Elo scores based on interest received
    await _update_elo_scores(interests, db)

    return matches


async def _create_full_match(
    group_id: uuid.UUID, user_a: uuid.UUID, user_b: uuid.UUID, db: AsyncSession
) -> Match:
    chat_room = ChatRoom(room_type="direct")
    db.add(chat_room)
    await db.flush()

    db.add(ChatParticipant(room_id=chat_room.id, user_id=user_a))
    db.add(ChatParticipant(room_id=chat_room.id, user_id=user_b))

    match = Match(
        group_id=group_id,
        user1_id=user_a,
        user2_id=user_b,
        chat_room_id=chat_room.id,
    )
    db.add(match)
    await db.flush()
    await log_event(db, user_a, "match_revealed", {"match_id": str(match.id), "group_id": str(group_id)})

    # Auto conversation starter
    group_result = await db.execute(select(DateGroup).where(DateGroup.id == group_id))
    group = group_result.scalar_one_or_none()
    activity_name = group.activity if group else "your group date"
    db.add(ChatMessage(
        room_id=chat_room.id,
        sender_id=YUNI_AI_USER_ID,
        content=f"You both had a great time at {activity_name}! Pick up where you left off 💬",
        message_type="system",
    ))

    result_a = await db.execute(select(User).where(User.id == user_a))
    result_b = await db.execute(select(User).where(User.id == user_b))
    ua = result_a.scalar_one_or_none()
    ub = result_b.scalar_one_or_none()

    if ua and ub:
        await notify_match(
            user1_push_token=ua.push_token,
            user1_name=ua.first_name,
            user2_push_token=ub.push_token,
            user2_name=ub.first_name,
            match_data={
                "type": "match",
                "match_id": str(match.id),
                "chat_room_id": str(chat_room.id),
            },
        )

    return match


async def _create_soft_match(
    group_id: uuid.UUID,
    interested_user_id: uuid.UUID,
    maybe_user_id: uuid.UUID,
    db: AsyncSession,
) -> SoftMatch:
    soft_match = SoftMatch(
        group_id=group_id,
        interested_user_id=interested_user_id,
        maybe_user_id=maybe_user_id,
        status="pending",
        reveal_at=datetime.utcnow() + timedelta(hours=48),
    )
    db.add(soft_match)
    await db.flush()
    await log_event(
        db, interested_user_id, "soft_match_created",
        {"soft_match_id": str(soft_match.id), "group_id": str(group_id)},
    )
    return soft_match


async def _update_elo_scores(interests: list[RomanticInterest], db: AsyncSession) -> None:
    """Update Elo scores for users based on interest they received."""
    # Aggregate scores received per user
    received_scores: dict[uuid.UUID, list[float]] = {}
    for ri in interests:
        score = INTEREST_SCORES.get(ri.interest_level, 0.0)
        received_scores.setdefault(ri.to_user_id, []).append(score)

    for user_id, scores in received_scores.items():
        if not scores:
            continue
        avg_score = sum(scores) / len(scores)
        # Adjust Elo: move toward average received interest (K-factor 16)
        elo_delta = 16 * (avg_score - 0.5)

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            user.elo_score = max(0.0, user.elo_score + elo_delta)
