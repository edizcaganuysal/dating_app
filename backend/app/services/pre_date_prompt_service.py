import logging
import uuid
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatMessage, ChatRoom
from app.models.pre_date_prompt import PreDatePrompt
from app.services.chat_ai_service import YUNI_AI_USER_ID
from app.websocket.manager import manager

logger = logging.getLogger(__name__)

SCHEDULED_PROMPTS = [
    (-3, "Lets break the ice! Everyone share your most controversial food opinion"),
    (-2, "Whats something youre weirdly proud of that most people dont know about?"),
    (-1, "What are you looking forward to tomorrow?"),
]
DAY_OF_PROMPT = "Almost time! Drop your outfit check"

DEFAULT_SEND_HOUR = 10  # 10 AM for day-before prompts


def _parse_time(scheduled_time: str) -> time:
    """Parse a time string like '7:00 PM' or '19:00' into a time object."""
    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M"):
        try:
            return datetime.strptime(scheduled_time.strip(), fmt).time()
        except ValueError:
            continue
    return time(18, 0)  # fallback to 6 PM


async def schedule_pre_date_prompts(
    group_id: uuid.UUID,
    room_id: uuid.UUID,
    scheduled_date: date,
    scheduled_time: str,
    db: AsyncSession,
) -> None:
    """Create 4 PreDatePrompt records for a confirmed group."""
    # Check if prompts already exist for this group
    existing = await db.execute(
        select(PreDatePrompt.id).where(PreDatePrompt.group_id == group_id).limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        return

    # Day -3, -2, -1 prompts at 10 AM
    for days_before, message in SCHEDULED_PROMPTS:
        send_date = scheduled_date + timedelta(days=days_before)
        send_at = datetime.combine(send_date, time(DEFAULT_SEND_HOUR, 0))
        db.add(PreDatePrompt(
            group_id=group_id,
            room_id=room_id,
            message=message,
            send_at=send_at,
        ))

    # Day-of prompt: 2 hours before scheduled_time
    event_time = _parse_time(scheduled_time)
    day_of_dt = datetime.combine(scheduled_date, event_time) - timedelta(hours=2)
    db.add(PreDatePrompt(
        group_id=group_id,
        room_id=room_id,
        message=DAY_OF_PROMPT,
        send_at=day_of_dt,
    ))


async def send_due_prompts(db: AsyncSession) -> int:
    """Find and send all due pre-date prompts. Returns count sent."""
    now = datetime.utcnow()
    result = await db.execute(
        select(PreDatePrompt).where(
            PreDatePrompt.sent == False,  # noqa: E712
            PreDatePrompt.send_at <= now,
        )
    )
    prompts = result.scalars().all()
    if not prompts:
        return 0

    sent_count = 0
    for prompt in prompts:
        msg = ChatMessage(
            room_id=prompt.room_id,
            sender_id=YUNI_AI_USER_ID,
            content=prompt.message,
            message_type="system",
        )
        db.add(msg)
        prompt.sent = True
        await db.flush()
        await db.refresh(msg)

        # Broadcast to connected clients
        try:
            await manager.broadcast(str(prompt.room_id), {
                "type": "message",
                "id": str(msg.id),
                "sender_id": str(YUNI_AI_USER_ID),
                "sender_name": "Yuni",
                "content": prompt.message,
                "message_type": "system",
                "created_at": msg.created_at.isoformat(),
            })
        except Exception as e:
            logger.warning(f"Failed to broadcast pre-date prompt: {e}")

        sent_count += 1

    await db.commit()
    logger.info(f"Sent {sent_count} pre-date prompts")
    return sent_count
