import uuid
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth_middleware import get_admin_user
from app.models.chat import ChatParticipant, ChatRoom
from app.models.date_request import DateRequest
from app.models.group import DateGroup, GroupMember
from app.models.match import Match
from app.models.report import FeedbackRating, Report
from app.models.user import User
from app.schemas.admin import (
    AdminGroupSummary,
    AdminMatchSummary,
    AdminReportSummary,
    AdminUserDetailResponse,
    AdminUserListResponse,
    AdminUserSummary,
    AdminUserUpdate,
    AnalyticsResponse,
    ManualGroupCreate,
    PendingDateRequestResponse,
    PendingRequestUser,
)
from app.schemas.matching import DateGroupResponse, GroupMemberResponse

router = APIRouter()


@router.get("/api/admin/users", response_model=AdminUserListResponse, status_code=200)
async def list_users(
    search: str | None = Query(None),
    gender: str | None = Query(None),
    is_suspended: bool | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    count_query = select(func.count()).select_from(User)

    conditions = []
    if search:
        pattern = f"%{search}%"
        conditions.append(
            or_(
                User.email.ilike(pattern),
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
            )
        )
    if gender:
        conditions.append(User.gender == gender)
    if is_suspended is not None:
        conditions.append(User.is_suspended == is_suspended)

    if conditions:
        for cond in conditions:
            query = query.where(cond)
            count_query = count_query.where(cond)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    users = list(result.scalars().all())

    # Get group and match counts for each user
    user_ids = [u.id for u in users]

    # Group counts
    group_counts: dict[uuid.UUID, int] = {}
    if user_ids:
        gc_result = await db.execute(
            select(GroupMember.user_id, func.count())
            .where(GroupMember.user_id.in_(user_ids))
            .group_by(GroupMember.user_id)
        )
        group_counts = dict(gc_result.all())

    # Match counts
    match_counts: dict[uuid.UUID, int] = {}
    if user_ids:
        mc_result = await db.execute(
            select(Match.user1_id, func.count())
            .where(Match.user1_id.in_(user_ids))
            .group_by(Match.user1_id)
        )
        for uid, cnt in mc_result.all():
            match_counts[uid] = cnt
        mc_result2 = await db.execute(
            select(Match.user2_id, func.count())
            .where(Match.user2_id.in_(user_ids))
            .group_by(Match.user2_id)
        )
        for uid, cnt in mc_result2.all():
            match_counts[uid] = match_counts.get(uid, 0) + cnt

    user_summaries = []
    for u in users:
        user_summaries.append(AdminUserSummary(
            id=u.id,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            gender=u.gender,
            age=u.age,
            is_email_verified=u.is_email_verified,
            is_selfie_verified=u.is_selfie_verified,
            is_suspended=u.is_suspended,
            no_show_count=u.no_show_count,
            created_at=u.created_at,
            total_groups=group_counts.get(u.id, 0),
            total_matches=match_counts.get(u.id, 0),
        ))

    return AdminUserListResponse(users=user_summaries, total=total)


@router.get("/api/admin/users/{user_id}", response_model=AdminUserDetailResponse, status_code=200)
async def get_user_detail(
    user_id: uuid.UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Groups
    groups_result = await db.execute(
        select(DateGroup)
        .join(GroupMember, GroupMember.group_id == DateGroup.id)
        .where(GroupMember.user_id == user_id)
        .order_by(DateGroup.scheduled_date.desc())
    )
    groups = [
        AdminGroupSummary(
            id=g.id,
            activity=g.activity,
            scheduled_date=g.scheduled_date,
            scheduled_time=g.scheduled_time,
            status=g.status,
            created_at=g.created_at,
        )
        for g in groups_result.scalars().all()
    ]

    # Matches
    matches_result = await db.execute(
        select(Match)
        .options(selectinload(Match.user1), selectinload(Match.user2))
        .where(or_(Match.user1_id == user_id, Match.user2_id == user_id))
        .order_by(Match.created_at.desc())
    )
    matches = []
    for m in matches_result.scalars().all():
        partner = m.user2 if m.user1_id == user_id else m.user1
        matches.append(AdminMatchSummary(
            id=m.id,
            partner_id=partner.id,
            partner_name=f"{partner.first_name} {partner.last_name}",
            group_id=m.group_id,
            created_at=m.created_at,
        ))

    # Reports (filed and received)
    filed_result = await db.execute(
        select(Report)
        .options(selectinload(Report.reported))
        .where(Report.reporter_id == user_id)
        .order_by(Report.created_at.desc())
    )
    received_result = await db.execute(
        select(Report)
        .options(selectinload(Report.reporter))
        .where(Report.reported_id == user_id)
        .order_by(Report.created_at.desc())
    )
    reports = []
    for r in filed_result.scalars().all():
        reports.append(AdminReportSummary(
            id=r.id,
            other_user_id=r.reported_id,
            other_user_name=f"{r.reported.first_name} {r.reported.last_name}",
            category=r.category,
            status=r.status,
            direction="filed",
            created_at=r.created_at,
        ))
    for r in received_result.scalars().all():
        reports.append(AdminReportSummary(
            id=r.id,
            other_user_id=r.reporter_id,
            other_user_name=f"{r.reporter.first_name} {r.reporter.last_name}",
            category=r.category,
            status=r.status,
            direction="received",
            created_at=r.created_at,
        ))

    return AdminUserDetailResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        gender=user.gender,
        age=user.age,
        phone=user.phone,
        university_domain=user.university_domain,
        program=user.program,
        year_of_study=user.year_of_study,
        bio=user.bio,
        interests=user.interests,
        is_email_verified=user.is_email_verified,
        is_selfie_verified=user.is_selfie_verified,
        is_admin=user.is_admin,
        is_suspended=user.is_suspended,
        no_show_count=user.no_show_count,
        created_at=user.created_at,
        updated_at=user.updated_at,
        groups=groups,
        matches=matches,
        reports=reports,
    )


@router.patch("/api/admin/users/{user_id}", response_model=AdminUserDetailResponse, status_code=200)
async def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.is_suspended is not None:
        user.is_suspended = body.is_suspended
    if body.is_admin is not None:
        user.is_admin = body.is_admin

    await db.commit()
    await db.refresh(user)

    # Re-use detail endpoint logic
    return await get_user_detail(user_id, current_user, db)


@router.get(
    "/api/admin/date-requests/pending",
    response_model=list[PendingDateRequestResponse],
    status_code=200,
)
async def list_pending_requests(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DateRequest)
        .options(selectinload(DateRequest.user))
        .where(DateRequest.status == "pending")
        .order_by(DateRequest.created_at.asc())
    )
    requests = result.scalars().all()

    return [
        PendingDateRequestResponse(
            id=r.id,
            user_id=r.user_id,
            group_size=r.group_size,
            activity=r.activity,
            status=r.status,
            created_at=r.created_at,
            user=PendingRequestUser(
                id=r.user.id,
                email=r.user.email,
                first_name=r.user.first_name,
                last_name=r.user.last_name,
                gender=r.user.gender,
                age=r.user.age,
                program=r.user.program,
                interests=r.user.interests,
            ),
        )
        for r in requests
    ]


@router.post("/api/admin/matching/manual", response_model=DateGroupResponse, status_code=201)
async def manual_create_group(
    body: ManualGroupCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate group size
    if len(body.user_ids) not in (4, 6):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group must have exactly 4 or 6 members",
        )

    # Check for duplicate user IDs
    if len(set(body.user_ids)) != len(body.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate user IDs",
        )

    # Fetch all users
    result = await db.execute(select(User).where(User.id.in_(body.user_ids)))
    users = list(result.scalars().all())
    if len(users) != len(body.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more users not found",
        )

    # Validate equal gender split
    gender_counts = Counter(u.gender for u in users)
    expected_per_gender = len(body.user_ids) // 2
    if len(gender_counts) != 2 or any(c != expected_per_gender for c in gender_counts.values()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Group must have equal gender split ({expected_per_gender} per gender)",
        )

    # Create the DateGroup
    group = DateGroup(
        activity=body.activity,
        scheduled_date=body.scheduled_date,
        scheduled_time=body.scheduled_time,
        status="upcoming",
    )
    db.add(group)
    await db.flush()

    # Find and link pending date requests for these users, create GroupMembers
    for user in users:
        # Try to find a pending date request for this user
        dr_result = await db.execute(
            select(DateRequest)
            .where(DateRequest.user_id == user.id, DateRequest.status == "pending")
            .order_by(DateRequest.created_at.desc())
            .limit(1)
        )
        date_request = dr_result.scalar_one_or_none()

        member = GroupMember(
            group_id=group.id,
            user_id=user.id,
            date_request_id=date_request.id if date_request else None,
        )
        db.add(member)

        # Update date request status
        if date_request:
            date_request.status = "matched"

    # Create group chat room
    chat_room = ChatRoom(room_type="group", group_id=group.id)
    db.add(chat_room)
    await db.flush()

    # Add all users as chat participants
    for user in users:
        db.add(ChatParticipant(room_id=chat_room.id, user_id=user.id))

    await db.commit()

    # Reload group with members for response
    result = await db.execute(
        select(DateGroup)
        .options(selectinload(DateGroup.members).selectinload(GroupMember.user))
        .where(DateGroup.id == group.id)
    )
    group = result.scalar_one()

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


@router.get("/api/admin/analytics", response_model=AnalyticsResponse, status_code=200)
async def get_analytics(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Total users
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()

    # Active users (created a date request in last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_users = (await db.execute(
        select(func.count(func.distinct(DateRequest.user_id)))
        .where(DateRequest.created_at >= thirty_days_ago)
    )).scalar()

    # Total groups
    total_groups = (await db.execute(select(func.count()).select_from(DateGroup))).scalar()

    # Total matches
    total_matches = (await db.execute(select(func.count()).select_from(Match))).scalar()

    # Average experience rating
    avg_rating = (await db.execute(
        select(func.avg(FeedbackRating.experience_rating))
    )).scalar()
    if avg_rating is not None:
        avg_rating = round(float(avg_rating), 2)

    # Pending reports
    pending_reports = (await db.execute(
        select(func.count()).select_from(Report).where(Report.status == "pending")
    )).scalar()

    # Total no-shows
    no_show_total = (await db.execute(
        select(func.coalesce(func.sum(User.no_show_count), 0))
    )).scalar()

    return AnalyticsResponse(
        total_users=total_users,
        active_users=active_users,
        total_groups=total_groups,
        total_matches=total_matches,
        avg_experience_rating=avg_rating,
        total_reports_pending=pending_reports,
        no_show_count_total=no_show_total,
    )


@router.post("/api/admin/seed", status_code=200)
async def seed_database_endpoint(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from app.seed import seed_database

    await seed_database(session=db)
    return {"detail": "Database seeded successfully"}
