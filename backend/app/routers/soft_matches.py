import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.chat import ChatParticipant, ChatRoom
from app.models.match import Match
from app.models.report import SoftMatch
from app.models.user import User
from app.schemas.feedback import (
    SoftMatchDetailResponse,
    SoftMatchRespondRequest,
    SoftMatchRespondResponse,
)
from app.services.analytics_service import log_event
from app.services.notification_service import send_push_notification

router = APIRouter(prefix="/api/feedback/soft-matches", tags=["feedback"])


@router.get("/pending", response_model=list[SoftMatchDetailResponse])
async def list_pending_soft_matches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SoftMatch)
        .where(
            SoftMatch.maybe_user_id == current_user.id,
            SoftMatch.status == "pending",
        )
        .options(
            selectinload(SoftMatch.interested_user),
            selectinload(SoftMatch.group),
        )
    )
    soft_matches = list(result.scalars().all())

    responses = []
    for sm in soft_matches:
        responses.append(SoftMatchDetailResponse(
            id=sm.id,
            group_id=sm.group_id,
            activity=sm.group.activity if sm.group else "unknown",
            interested_user=sm.interested_user,
            status=sm.status,
            reveal_at=sm.reveal_at,
            created_at=sm.created_at,
        ))
    return responses


@router.post(
    "/{soft_match_id}/respond",
    status_code=status.HTTP_200_OK,
    response_model=SoftMatchRespondResponse,
)
async def respond_to_soft_match(
    soft_match_id: uuid.UUID,
    payload: SoftMatchRespondRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SoftMatch)
        .where(SoftMatch.id == soft_match_id)
        .options(selectinload(SoftMatch.interested_user))
    )
    soft_match = result.scalar_one_or_none()

    if not soft_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Soft match not found",
        )

    if soft_match.maybe_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the recipient of this soft match",
        )

    if soft_match.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This soft match has already been responded to",
        )

    if payload.accepted:
        chat_room = ChatRoom(room_type="direct")
        db.add(chat_room)
        await db.flush()

        db.add(ChatParticipant(room_id=chat_room.id, user_id=soft_match.interested_user_id))
        db.add(ChatParticipant(room_id=chat_room.id, user_id=current_user.id))

        match = Match(
            group_id=soft_match.group_id,
            user1_id=soft_match.interested_user_id,
            user2_id=current_user.id,
            chat_room_id=chat_room.id,
        )
        db.add(match)

        soft_match.status = "accepted"
        await db.flush()

        await log_event(db, current_user.id, "soft_match_accepted", {
            "soft_match_id": str(soft_match.id),
            "match_id": str(match.id),
        })

        interested_user = soft_match.interested_user
        if interested_user and interested_user.push_token:
            await send_push_notification(
                push_token=interested_user.push_token,
                title="Someone wants to connect!",
                body=f"{current_user.first_name} accepted your interest! Start chatting now.",
                data={
                    "type": "soft_match_accepted",
                    "match_id": str(match.id),
                    "chat_room_id": str(chat_room.id),
                },
            )

        await db.commit()

        return SoftMatchRespondResponse(
            status="accepted",
            match_id=match.id,
            chat_room_id=chat_room.id,
        )
    else:
        soft_match.status = "declined"

        await log_event(db, current_user.id, "soft_match_declined", {
            "soft_match_id": str(soft_match.id),
        })

        await db.commit()

        return SoftMatchRespondResponse(status="declined")
