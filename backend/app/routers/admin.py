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
from app.models.matching_batch import MatchingBatch, ProposedGroup, ProposedGroupMember
from app.schemas.matching_batch import (
    BatchApprovalRequest,
    MatchingBatchDetailResponse,
    MatchingBatchResponse,
    ProposedGroupMemberResponse,
    ProposedGroupResponse,
)
from app.models.report import FeedbackRating, Report
from app.models.user import User
from app.models.date_request import AvailabilitySlot, PreGroupFriend
from app.models.user import VibeAnswer
from app.schemas.admin import (
    AdminDateRequestCreate,
    AdminGroupSummary,
    AdminMatchSummary,
    AdminReportSummary,
    AdminUserCreate,
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
from app.services.auth_service import hash_password

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


@router.post("/api/admin/users/create", response_model=AdminUserDetailResponse, status_code=201)
async def admin_create_user(
    body: AdminUserCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a fully set-up user in one step (bypasses email/selfie verification)."""
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Validate gender
    if body.gender not in ("male", "female"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gender must be 'male' or 'female'")

    # Extract domain
    domain = body.email.split("@")[1] if "@" in body.email else ""

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        university_domain=domain,
        gender=body.gender,
        age=body.age,
        program=body.program,
        year_of_study=body.year_of_study,
        bio=body.bio,
        photo_urls=body.photo_urls,
        interests=body.interests,
        age_range_min=body.age_range_min,
        age_range_max=body.age_range_max,
        is_email_verified=True,
        is_selfie_verified=True,
    )
    db.add(user)
    await db.flush()

    # Create vibe answers
    for va in body.vibe_answers:
        db.add(VibeAnswer(user_id=user.id, question=va.question, answer=va.answer))

    await db.commit()
    return await get_user_detail(user.id, current_user, db)


@router.post("/api/admin/date-requests/create", status_code=201)
async def admin_create_date_request(
    body: AdminDateRequestCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a date request on behalf of a user."""
    # Verify user exists
    result = await db.execute(select(User).where(User.id == body.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Validate group size
    if body.group_size not in (4, 6):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group size must be 4 or 6")

    # Check no existing pending request
    existing = await db.execute(
        select(DateRequest).where(DateRequest.user_id == body.user_id, DateRequest.status == "pending")
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already has a pending date request")

    # Validate pre-group friends
    max_friends = (body.group_size // 2) - 1
    if len(body.pre_group_friend_ids) > max_friends:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Max {max_friends} pre-group friends for group size {body.group_size}",
        )
    for friend_id in body.pre_group_friend_ids:
        fr = await db.execute(select(User).where(User.id == friend_id))
        friend = fr.scalar_one_or_none()
        if not friend:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Friend {friend_id} not found")
        if friend.gender != user.gender:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pre-group friends must be same gender")

    # Create date request
    date_request = DateRequest(
        user_id=body.user_id,
        group_size=body.group_size,
        activity=body.activity,
        status="pending",
    )
    db.add(date_request)
    await db.flush()

    # Create availability slots
    for slot in body.availability_slots:
        from datetime import date as date_type
        slot_date = slot.get("date")
        if isinstance(slot_date, str):
            slot_date = date_type.fromisoformat(slot_date)
        db.add(AvailabilitySlot(
            date_request_id=date_request.id,
            date=slot_date,
            time_window=slot.get("time_window", "evening"),
        ))

    # Create pre-group friends
    for friend_id in body.pre_group_friend_ids:
        db.add(PreGroupFriend(date_request_id=date_request.id, friend_user_id=friend_id))

    await db.commit()
    return {"id": str(date_request.id), "user_id": str(body.user_id), "status": "pending", "activity": body.activity}


@router.get("/api/admin/selfie-reviews", status_code=200)
async def list_pending_selfies(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List users with pending selfie verification."""
    result = await db.execute(
        select(User).where(User.selfie_status == "pending").order_by(User.updated_at.desc())
    )
    users = list(result.scalars().all())
    return [
        {
            "id": str(u.id),
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "photo_urls": u.photo_urls or [],
            "selfie_urls": u.selfie_urls or [],
            "selfie_status": u.selfie_status,
        }
        for u in users
    ]


@router.post("/api/admin/selfie-reviews/{user_id}", status_code=200)
async def review_selfie(
    user_id: uuid.UUID,
    action: str = "approve",  # "approve" or "reject"
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject a user's selfie verification."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if action == "approve":
        user.selfie_status = "verified"
        user.is_selfie_verified = True
    elif action == "reject":
        user.selfie_status = "rejected"
        user.is_selfie_verified = False
    else:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    await db.commit()
    return {"user_id": str(user_id), "selfie_status": user.selfie_status}


@router.post("/api/admin/seed", status_code=200)
async def seed_database_endpoint(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from app.seed import seed_database

    await seed_database(session=db)
    return {"detail": "Database seeded successfully"}


# ── AI Batch Matching Endpoints ──


@router.get("/api/admin/matching/batches", response_model=list[MatchingBatchResponse])
async def list_matching_batches(
    status_filter: str = Query(None, alias="status"),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all matching batches, optionally filtered by status."""
    query = select(MatchingBatch).options(selectinload(MatchingBatch.proposed_groups))
    if status_filter:
        query = query.where(MatchingBatch.status == status_filter)
    query = query.order_by(MatchingBatch.created_at.desc())
    result = await db.execute(query)
    batches = result.scalars().all()
    return [
        MatchingBatchResponse(
            id=b.id,
            activity=b.activity,
            time_slot_date=b.time_slot_date,
            time_slot_hours=b.time_slot_hours or [],
            status=b.status,
            user_count=b.user_count,
            trigger_type=b.trigger_type,
            center_lat=b.center_lat,
            center_lng=b.center_lng,
            proposed_groups_count=len(b.proposed_groups),
            created_at=b.created_at,
        )
        for b in batches
    ]


@router.get("/api/admin/matching/batches/{batch_id}", response_model=MatchingBatchDetailResponse)
async def get_batch_detail(
    batch_id: uuid.UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full batch detail with all proposed groups and members."""
    result = await db.execute(
        select(MatchingBatch)
        .where(MatchingBatch.id == batch_id)
        .options(
            selectinload(MatchingBatch.proposed_groups)
            .selectinload(ProposedGroup.members)
            .selectinload(ProposedGroupMember.user)
        )
    )
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    groups = []
    for pg in batch.proposed_groups:
        members = []
        for m in pg.members:
            u = m.user
            members.append(ProposedGroupMemberResponse(
                user_id=u.id,
                first_name=u.first_name,
                age=u.age,
                gender=u.gender,
                program=u.program,
                photo_urls=u.photo_urls or [],
                interests=u.interests or [],
                attractiveness_score=u.attractiveness_score or 5.0,
            ))
        groups.append(ProposedGroupResponse(
            id=pg.id,
            activity=pg.activity,
            scheduled_date=pg.scheduled_date,
            scheduled_time=pg.scheduled_time,
            status=pg.status,
            ai_compatibility_score=pg.ai_compatibility_score,
            ai_reasoning=pg.ai_reasoning,
            members=members,
            created_at=pg.created_at,
        ))

    return MatchingBatchDetailResponse(
        id=batch.id,
        activity=batch.activity,
        time_slot_date=batch.time_slot_date,
        time_slot_hours=batch.time_slot_hours or [],
        status=batch.status,
        user_count=batch.user_count,
        trigger_type=batch.trigger_type,
        center_lat=batch.center_lat,
        center_lng=batch.center_lng,
        proposed_groups_count=len(groups),
        created_at=batch.created_at,
        proposed_groups=groups,
        ai_model_used=batch.ai_model_used,
        ai_tokens_used=batch.ai_tokens_used,
    )


@router.post("/api/admin/matching/batches/{batch_id}/approve")
async def approve_batch_groups(
    batch_id: uuid.UUID,
    body: BatchApprovalRequest,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject specific proposed groups within a batch."""
    result = await db.execute(
        select(MatchingBatch).where(MatchingBatch.id == batch_id)
        .options(selectinload(MatchingBatch.proposed_groups).selectinload(ProposedGroup.members))
    )
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    approved_count = 0
    rejected_count = 0

    for pg in batch.proposed_groups:
        if pg.id in body.approved_group_ids:
            pg.status = "approved"
            # Create real DateGroup from proposed group
            date_group = DateGroup(
                activity=pg.activity,
                scheduled_date=pg.scheduled_date,
                scheduled_time=pg.scheduled_time,
                status="upcoming",
            )
            db.add(date_group)
            await db.flush()

            for m in pg.members:
                db.add(GroupMember(
                    group_id=date_group.id,
                    user_id=m.user_id,
                    date_request_id=m.date_request_id,
                ))
                # Update date request status
                req_result = await db.execute(
                    select(DateRequest).where(DateRequest.id == m.date_request_id)
                )
                req = req_result.scalar_one_or_none()
                if req:
                    req.status = "matched"

            # Create group chat room
            chat_room = ChatRoom(room_type="group", group_id=date_group.id)
            db.add(chat_room)
            await db.flush()

            member_names = []
            for m in pg.members:
                db.add(ChatParticipant(room_id=chat_room.id, user_id=m.user_id))
                user_result = await db.execute(select(User).where(User.id == m.user_id))
                user = user_result.scalar_one_or_none()
                if user:
                    member_names.append(user.first_name)

            # Send Yuni AI welcome message
            from app.services.chat_ai_service import send_welcome_message
            await send_welcome_message(
                room_id=chat_room.id,
                activity=pg.activity,
                member_names=member_names,
                scheduled_date=str(pg.scheduled_date),
                scheduled_time=pg.scheduled_time,
                db=db,
            )

            pg.status = "executed"
            approved_count += 1

        elif pg.id in body.rejected_group_ids:
            pg.status = "rejected"
            # Return users to pending pool
            for m in pg.members:
                req_result = await db.execute(
                    select(DateRequest).where(DateRequest.id == m.date_request_id)
                )
                req = req_result.scalar_one_or_none()
                if req and req.status != "pending":
                    req.status = "pending"
            rejected_count += 1

    # Update batch status
    all_resolved = all(pg.status in ("executed", "rejected") for pg in batch.proposed_groups)
    if all_resolved:
        batch.status = "executed" if approved_count > 0 else "rejected"

    await db.commit()
    return {
        "approved": approved_count,
        "rejected": rejected_count,
        "batch_status": batch.status,
    }


@router.post("/api/admin/matching/batches/{batch_id}/approve-all")
async def approve_all_in_batch(
    batch_id: uuid.UUID,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Quick action: approve all proposed groups in a batch."""
    result = await db.execute(
        select(MatchingBatch).where(MatchingBatch.id == batch_id)
        .options(selectinload(MatchingBatch.proposed_groups))
    )
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    all_ids = [pg.id for pg in batch.proposed_groups if pg.status == "proposed"]
    return await approve_batch_groups(
        batch_id, BatchApprovalRequest(approved_group_ids=all_ids), current_user, db,
    )


@router.post("/api/admin/matching/trigger")
async def trigger_matching_pipeline(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger the full matching pipeline (batch formation + AI matching)."""
    from app.services.batch_formation import form_batches
    from app.services.ai_matching import run_matching_for_batch

    batches = await form_batches(db)

    matched_count = 0
    for batch in batches:
        if batch.user_count >= 8:
            proposed = await run_matching_for_batch(batch, db, force=False)
            matched_count += len(proposed)

    return {
        "batches_created": len(batches),
        "groups_proposed": matched_count,
    }
