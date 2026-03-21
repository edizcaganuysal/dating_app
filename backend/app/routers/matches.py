import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.match import Match
from app.models.user import User
from app.schemas.matching import MatchResponse
from app.schemas.profile import PublicProfileResponse

router = APIRouter(prefix="/api/matches", tags=["matches"])


def _match_to_response(match: Match, current_user_id: uuid.UUID) -> MatchResponse:
    """Convert a Match ORM object to MatchResponse, picking the partner."""
    partner = match.user2 if match.user1_id == current_user_id else match.user1
    return MatchResponse(
        id=match.id,
        partner=PublicProfileResponse.model_validate(partner),
        chat_room_id=match.chat_room_id,
        group_id=match.group_id,
        created_at=match.created_at,
    )


@router.get("", response_model=list[MatchResponse])
async def list_matches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Match)
        .where(
            or_(
                Match.user1_id == current_user.id,
                Match.user2_id == current_user.id,
            )
        )
        .options(selectinload(Match.user1), selectinload(Match.user2))
    )
    matches = list(result.scalars().all())
    return [_match_to_response(m, current_user.id) for m in matches]


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Match)
        .where(Match.id == match_id)
        .options(selectinload(Match.user1), selectinload(Match.user2))
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )
    if current_user.id not in (match.user1_id, match.user2_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this match",
        )
    return _match_to_response(match, current_user.id)
