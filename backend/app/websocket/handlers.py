import uuid

from fastapi import WebSocket
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.chat import ChatMessage, ChatParticipant, ChatRoom
from app.models.group import DateGroup, GroupMember
from app.models.user import User
from app.services.chat_ai_service import (
    GENIE_USER_ID,
    check_rate_limit,
    generate_assistant_response,
)
from app.websocket.manager import manager


async def authenticate_ws(websocket: WebSocket, token: str, db: AsyncSession) -> User | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            await websocket.close(code=4001)
            return None
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        await websocket.close(code=4001)
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.is_suspended:
        await websocket.close(code=4001)
        return None
    return user


async def verify_participant(user_id: uuid.UUID, room_id: uuid.UUID, db: AsyncSession) -> bool:
    result = await db.execute(
        select(ChatParticipant).where(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def handle_chat_message(data: dict, user: User, room_id: str, db: AsyncSession):
    content = data.get("content", "").strip()
    if not content:
        return

    msg = ChatMessage(
        room_id=uuid.UUID(room_id),
        sender_id=user.id,
        content=content,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    await manager.broadcast(room_id, {
        "type": "message",
        "id": str(msg.id),
        "sender_id": str(user.id),
        "sender_name": user.first_name,
        "content": content,
        "message_type": "text",
        "created_at": msg.created_at.isoformat(),
    })

    # Check for @genie trigger
    if "@genie" in content.lower():
        await _handle_genie_response(room_id, content, db)


async def _handle_genie_response(room_id: str, user_query: str, db: AsyncSession):
    """Handle an @genie mention by generating and broadcasting an AI response."""
    if not check_rate_limit(room_id):
        return

    # Broadcast Genie typing indicator
    await manager.broadcast(room_id, {
        "type": "typing",
        "user_id": str(GENIE_USER_ID),
        "user_name": "Genie",
    })

    # Load room's group to get activity and members
    room_uuid = uuid.UUID(room_id)
    result = await db.execute(
        select(ChatRoom).where(ChatRoom.id == room_uuid)
    )
    room = result.scalar_one_or_none()
    if not room or not room.group_id:
        return

    # Get group activity
    result = await db.execute(
        select(DateGroup).where(DateGroup.id == room.group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        return

    # Get member names
    result = await db.execute(
        select(User)
        .join(GroupMember, GroupMember.user_id == User.id)
        .where(GroupMember.group_id == group.id)
    )
    members = result.scalars().all()
    member_names = [m.first_name for m in members]

    # Get recent messages for context
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.room_id == room_uuid)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    recent = result.scalars().all()
    recent_msgs = [
        {"sender_name": "User", "content": m.content}
        for m in reversed(recent)
    ]

    # Strip @genie from the query
    query = user_query.lower().replace("@genie", "").strip()
    if not query:
        query = "Give us some helpful tips for our date!"

    # Generate AI response
    response_text = await generate_assistant_response(
        activity=group.activity,
        member_names=member_names,
        recent_messages=recent_msgs,
        user_query=query,
    )

    # Save Genie's message
    genie_msg = ChatMessage(
        room_id=room_uuid,
        sender_id=GENIE_USER_ID,
        content=response_text,
        message_type="ai",
    )
    db.add(genie_msg)
    await db.commit()
    await db.refresh(genie_msg)

    # Broadcast Genie's response
    await manager.broadcast(room_id, {
        "type": "message",
        "id": str(genie_msg.id),
        "sender_id": str(GENIE_USER_ID),
        "sender_name": "Genie",
        "content": response_text,
        "message_type": "ai",
        "created_at": genie_msg.created_at.isoformat(),
    })


async def handle_typing(user: User, room_id: str):
    await manager.broadcast(
        room_id,
        {
            "type": "typing",
            "user_id": str(user.id),
            "user_name": user.first_name,
        },
        exclude_sender=str(user.id),
    )
