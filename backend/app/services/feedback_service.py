import uuid
from itertools import combinations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatParticipant, ChatRoom
from app.models.match import Match
from app.models.report import RomanticInterest
from app.models.user import User
from app.services.notification_service import notify_match


async def check_and_create_matches(
    group_id: uuid.UUID, db: AsyncSession
) -> list[Match]:
    """Find mutual romantic interests in a group and create Match records with direct chat rooms."""
    result = await db.execute(
        select(RomanticInterest).where(
            RomanticInterest.group_id == group_id,
            RomanticInterest.interested == True,  # noqa: E712
        )
    )
    interests = list(result.scalars().all())

    # Build set of (from, to) pairs where interested=True
    interested_pairs = {(ri.from_user_id, ri.to_user_id) for ri in interests}

    # Collect all unique user IDs
    all_user_ids = {ri.from_user_id for ri in interests} | {ri.to_user_id for ri in interests}

    matches: list[Match] = []
    for a, b in combinations(all_user_ids, 2):
        if (a, b) in interested_pairs and (b, a) in interested_pairs:
            # Create a direct chat room for the matched pair
            chat_room = ChatRoom(room_type="direct")
            db.add(chat_room)
            await db.flush()

            # Add both users as participants
            db.add(ChatParticipant(room_id=chat_room.id, user_id=a))
            db.add(ChatParticipant(room_id=chat_room.id, user_id=b))

            match = Match(
                group_id=group_id,
                user1_id=a,
                user2_id=b,
                chat_room_id=chat_room.id,
            )
            db.add(match)
            matches.append(match)

            # Send push notifications to both users
            result_a = await db.execute(select(User).where(User.id == a))
            result_b = await db.execute(select(User).where(User.id == b))
            user_a = result_a.scalar_one_or_none()
            user_b = result_b.scalar_one_or_none()

            if user_a and user_b:
                await notify_match(
                    user1_push_token=user_a.push_token,
                    user1_name=user_a.first_name,
                    user2_push_token=user_b.push_token,
                    user2_name=user_b.first_name,
                    match_data={
                        "type": "match",
                        "match_id": str(match.id),
                        "chat_room_id": str(chat_room.id),
                    },
                )

    return matches
