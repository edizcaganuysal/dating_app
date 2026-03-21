import uuid

from fastapi import WebSocket
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chat import ChatMessage, ChatParticipant
from app.models.user import User
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
        "created_at": msg.created_at.isoformat(),
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
