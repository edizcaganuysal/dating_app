from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth_middleware import get_admin_user, get_current_user
from app.models.group import DateGroup, GroupMember
from app.models.user import User
from app.schemas.matching import (
    BatchMatchingResponse,
    DateGroupResponse,
    GroupMemberResponse,
)
from app.services.matching_service import run_batch_matching

router = APIRouter()


def _build_group_response(group: DateGroup) -> DateGroupResponse:
    members = []
    for gm in group.members:
        u = gm.user
        members.append(GroupMemberResponse(
            id=gm.id,
            user_id=u.id,
            first_name=u.first_name,
            age=u.age,
            gender=u.gender,
            program=u.program,
            bio=u.bio,
            photo_urls=u.photo_urls,
            interests=u.interests,
            is_selfie_verified=u.is_selfie_verified,
        ))
    return DateGroupResponse(
        id=group.id,
        activity=group.activity,
        scheduled_date=group.scheduled_date,
        scheduled_time=group.scheduled_time,
        venue_name=group.venue_name,
        venue_address=group.venue_address,
        status=group.status,
        members=members,
        created_at=group.created_at,
    )


@router.post("/api/admin/matching/run-batch", response_model=BatchMatchingResponse, status_code=200)
async def run_batch(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    groups = await run_batch_matching(db)
    group_responses = [_build_group_response(g) for g in groups]
    return BatchMatchingResponse(
        groups_formed=len(group_responses),
        groups=group_responses,
    )


@router.get("/api/matching/my-groups", response_model=list[DateGroupResponse], status_code=200)
async def my_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DateGroup)
        .join(GroupMember, GroupMember.group_id == DateGroup.id)
        .where(GroupMember.user_id == current_user.id)
        .options(selectinload(DateGroup.members).selectinload(GroupMember.user))
    )
    groups = list(result.scalars().unique().all())
    return [_build_group_response(g) for g in groups]
