import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.group import GroupMember
from app.models.report import BlockedPair, FeedbackRating, Report, RomanticInterest
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services.feedback_service import check_and_create_matches

router = APIRouter(prefix="/api/groups/{group_id}/feedback", tags=["feedback"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=FeedbackResponse)
async def submit_feedback(
    group_id: uuid.UUID,
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check user is a member of the group
    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group",
        )

    # Check user hasn't already submitted feedback
    result = await db.execute(
        select(FeedbackRating).where(
            FeedbackRating.group_id == group_id,
            FeedbackRating.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted feedback for this group",
        )

    # Create FeedbackRating
    feedback = FeedbackRating(
        group_id=group_id,
        user_id=current_user.id,
        experience_rating=payload.experience_rating,
    )
    db.add(feedback)

    # Create RomanticInterest records
    for ri in payload.romantic_interests:
        db.add(RomanticInterest(
            group_id=group_id,
            from_user_id=current_user.id,
            to_user_id=ri.user_id,
            interested=ri.interested,
        ))

    # Create BlockedPair records
    for blocked_id in payload.block_user_ids:
        db.add(BlockedPair(
            blocker_id=current_user.id,
            blocked_id=blocked_id,
        ))

    # Create Report records
    for reported_id in payload.report_user_ids:
        db.add(Report(
            reporter_id=current_user.id,
            reported_id=reported_id,
            group_id=group_id,
            category=payload.report_category or "other",
        ))

    await db.flush()

    # Check if all members have submitted — if so, process mutual matches
    member_count_result = await db.execute(
        select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group_id)
    )
    member_count = member_count_result.scalar()

    feedback_count_result = await db.execute(
        select(func.count()).select_from(FeedbackRating).where(FeedbackRating.group_id == group_id)
    )
    feedback_count = feedback_count_result.scalar()

    if feedback_count == member_count:
        await check_and_create_matches(group_id, db)

    await db.commit()
    await db.refresh(feedback)

    return FeedbackResponse(
        id=feedback.id,
        group_id=feedback.group_id,
        experience_rating=feedback.experience_rating,
        submitted_at=feedback.created_at,
    )


@router.get("/mine", response_model=FeedbackResponse)
async def get_my_feedback(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FeedbackRating).where(
            FeedbackRating.group_id == group_id,
            FeedbackRating.user_id == current_user.id,
        )
    )
    feedback = result.scalar_one_or_none()
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found",
        )
    return FeedbackResponse(
        id=feedback.id,
        group_id=feedback.group_id,
        experience_rating=feedback.experience_rating,
        submitted_at=feedback.created_at,
    )
