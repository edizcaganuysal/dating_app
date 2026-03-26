import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.match import Match
from app.models.user import User
from app.schemas.second_date import SecondDateRespondRequest, SecondDateResponse
from app.services import second_date_service

router = APIRouter(prefix="/api/dates/second-date", tags=["second-dates"])


async def _verify_match_participant(
    match_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Match:
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if user_id not in (match.user1_id, match.user2_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not part of this match")
    return match


@router.get("/suggestions/{match_id}", response_model=list[SecondDateResponse])
async def get_suggestions(
    match_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_match_participant(match_id, current_user.id, db)
    suggestions = await second_date_service.get_suggestions(db, match_id)
    return suggestions


@router.post("/{second_date_id}/propose", response_model=SecondDateResponse)
async def propose_date(
    second_date_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        sd = await second_date_service.propose_date(db, second_date_id, current_user.id)
        await db.commit()
        return sd
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{second_date_id}/respond", response_model=SecondDateResponse)
async def respond_to_date(
    second_date_id: uuid.UUID,
    body: SecondDateRespondRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        sd = await second_date_service.respond_to_date(db, second_date_id, current_user.id, body.accepted)
        await db.commit()
        return sd
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
