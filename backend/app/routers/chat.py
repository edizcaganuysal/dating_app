import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import or_, select, and_, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.chat import ChatMessage, ChatParticipant, ChatRoom
from app.models.user import User
from app.schemas.chat import ChatMessageResponse, ChatRoomResponse, LastMessage, ParticipantInfo
from app.websocket.handlers import authenticate_ws, handle_chat_message, handle_typing, verify_participant
from app.websocket.manager import manager

router = APIRouter(tags=["chat"])


# --- WebSocket endpoint ---

@router.websocket("/api/ws/chat/{room_id}")
async def websocket_chat(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not token:
        await websocket.close(code=4001)
        return

    user = await authenticate_ws(websocket, token, db)
    if not user:
        return

    try:
        room_uuid = uuid.UUID(room_id)
    except ValueError:
        await websocket.close(code=4002)
        return

    is_participant = await verify_participant(user.id, room_uuid, db)
    if not is_participant:
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, room_id, str(user.id))
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "message":
                await handle_chat_message(data, user, room_id, db)
            elif msg_type == "typing":
                await handle_typing(user, room_id)
            else:
                await websocket.send_json({"type": "error", "detail": "Unknown message type"})
    except WebSocketDisconnect:
        await manager.disconnect(websocket, room_id)


# --- REST endpoints ---

@router.get("/api/chat/rooms", response_model=list[ChatRoomResponse])
async def list_chat_rooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get rooms this user participates in
    result = await db.execute(
        select(ChatRoom)
        .join(ChatParticipant, ChatParticipant.room_id == ChatRoom.id)
        .where(ChatParticipant.user_id == current_user.id)
        .options(
            selectinload(ChatRoom.participants).selectinload(ChatParticipant.user),
        )
    )
    rooms = result.scalars().unique().all()

    response = []
    for room in rooms:
        # Get last message for this room
        last_msg_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.room_id == room.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()

        response.append(ChatRoomResponse(
            id=room.id,
            room_type=room.room_type,
            group_id=room.group_id,
            participants=[
                ParticipantInfo(user_id=p.user_id, first_name=p.user.first_name)
                for p in room.participants
            ],
            last_message=LastMessage(content=last_msg.content, created_at=last_msg.created_at)
            if last_msg else None,
            created_at=room.created_at,
        ))

    return response


@router.get("/api/chat/rooms/{room_id}/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    room_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, le=100, ge=1),
    before: uuid.UUID | None = Query(default=None),
):
    # Verify user is a participant
    is_participant = await verify_participant(current_user.id, room_id, db)
    if not is_participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant of this room")

    query = (
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .options(selectinload(ChatMessage.sender))
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
    )

    if before:
        # Get the created_at and id of the cursor message for tie-breaking
        cursor_result = await db.execute(
            select(ChatMessage.created_at, ChatMessage.id).where(ChatMessage.id == before)
        )
        cursor_row = cursor_result.one_or_none()
        if cursor_row:
            cursor_ts, cursor_id = cursor_row
            query = query.where(
                or_(
                    ChatMessage.created_at < cursor_ts,
                    and_(ChatMessage.created_at == cursor_ts, ChatMessage.id < cursor_id),
                )
            )

    result = await db.execute(query)
    messages = result.scalars().all()

    return [
        ChatMessageResponse(
            id=msg.id,
            room_id=msg.room_id,
            sender_id=msg.sender_id,
            sender_name=msg.sender.first_name,
            content=msg.content,
            message_type=msg.message_type,
            created_at=msg.created_at,
        )
        for msg in messages
    ]
