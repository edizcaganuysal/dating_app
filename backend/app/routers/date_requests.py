import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.date_request import AvailabilitySlot, DateRequest, DateRequestTemplate, PreGroupFriend
from app.models.user import User
from app.schemas.date_request import (
    DateRequestCreate,
    DateRequestResponse,
    DateRequestUpdate,
)

router = APIRouter(prefix="/api/date-requests", tags=["date-requests"])


def _to_response(dr: DateRequest) -> DateRequestResponse:
    return DateRequestResponse(
        id=dr.id,
        user_id=dr.user_id,
        group_size=dr.group_size,
        activity=dr.activity,
        status=dr.status,
        availability_slots=dr.availability_slots,
        pre_group_friend_ids=[f.friend_user_id for f in dr.pre_group_friends],
        created_at=dr.created_at,
    )


def _load_options():
    return [selectinload(DateRequest.availability_slots), selectinload(DateRequest.pre_group_friends)]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DateRequestResponse)
async def create_date_request(
    data: DateRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check no existing pending request for the SAME activity
    existing = await db.execute(
        select(DateRequest).where(
            DateRequest.user_id == current_user.id,
            DateRequest.status == "pending",
            DateRequest.activity == data.activity.value,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"You already have a pending request for {data.activity.value}")

    # Validate pre-group friends
    max_friends = (data.group_size // 2) - 1
    if len(data.pre_group_friend_ids) > max_friends:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"For a group of {data.group_size}, you can have at most {max_friends} pre-group friend(s)",
        )

    for friend_id in data.pre_group_friend_ids:
        result = await db.execute(select(User).where(User.id == friend_id))
        friend = result.scalar_one_or_none()
        if not friend:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Friend {friend_id} not found")
        if friend.gender != current_user.gender:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pre-group friends must be the same gender as you",
            )

    # Create date request
    dr = DateRequest(
        user_id=current_user.id,
        group_size=data.group_size,
        activity=data.activity.value,
        status="pending",
    )
    db.add(dr)
    await db.flush()

    # Create availability slots
    for slot in data.availability_slots:
        db.add(AvailabilitySlot(
            date_request_id=dr.id,
            date=slot.date,
            time_window=slot.time_window.value if slot.time_window else None,
            time_hours=slot.get_hours(),
        ))

    # Create pre-group friends
    for friend_id in data.pre_group_friend_ids:
        db.add(PreGroupFriend(date_request_id=dr.id, friend_user_id=friend_id))

    await db.commit()

    # Auto-create companion requests for test user
    if current_user.email == "tester@mail.utoronto.ca":
        await _create_companion_test_requests(current_user, data, db)

    # Reload with relationships
    result = await db.execute(
        select(DateRequest).where(DateRequest.id == dr.id).options(*_load_options())
    )
    dr = result.scalar_one()
    return _to_response(dr)


async def _create_companion_test_requests(main_user: User, data, db: AsyncSession):
    """When the main test user creates a request, auto-create matching requests
    for the 3 companion test users and trigger instant matching."""
    from app.routers.auth import TEST_USERS, _setup_test_user

    companion_emails = [e for e in TEST_USERS if e != "tester@mail.utoronto.ca"]
    companion_users = []

    # Force group_size=4 since we only have 4 test users
    effective_group_size = 4

    # Also update the main user's request to group_size=4
    main_req = await db.execute(
        select(DateRequest).where(
            DateRequest.user_id == main_user.id,
            DateRequest.status == "pending",
            DateRequest.activity == data.activity.value,
        )
    )
    main_dr = main_req.scalar_one_or_none()
    if main_dr:
        main_dr.group_size = effective_group_size

    for email in companion_emails:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            continue
        # Ensure profile is set up
        if not user.bio:
            await _setup_test_user(user, TEST_USERS[email], db)

        # Cancel ALL existing pending requests for this user
        existing = await db.execute(
            select(DateRequest).where(
                DateRequest.user_id == user.id,
                DateRequest.status == "pending",
            )
        )
        for old_req in existing.scalars().all():
            old_req.status = "cancelled"

        # Create matching request with same activity and group_size=4
        dr = DateRequest(
            user_id=user.id,
            group_size=effective_group_size,
            activity=data.activity.value,
            status="pending",
        )
        db.add(dr)
        await db.flush()

        for slot in data.availability_slots:
            db.add(AvailabilitySlot(
                date_request_id=dr.id,
                date=slot.date,
                time_window=slot.time_window.value if slot.time_window else None,
                time_hours=slot.get_hours(),
            ))

        companion_users.append(user)

    await db.commit()
    print(f"[TEST] Created companion requests for {len(companion_users)} users, activity={data.activity.value}, group_size={effective_group_size}")

    # Trigger instant matching
    try:
        from app.services.matching_service import run_batch_matching
        groups = await run_batch_matching(db)
        if groups:
            print(f"[TEST] Auto-matched {len(groups)} groups for test users")
            for g in groups:
                print(f"[TEST]   Group {g.id}: {g.activity}, {len(g.members)} members, chat_room={g.chat_room_id}")
        else:
            print(f"[TEST] WARNING: No groups formed. Check gender balance and availability overlap.")
    except Exception as e:
        import traceback
        print(f"[TEST] Auto-matching failed: {e}")
        traceback.print_exc()


@router.get("", response_model=list[DateRequestResponse])
async def list_date_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DateRequest)
        .where(DateRequest.user_id == current_user.id)
        .options(*_load_options())
        .order_by(DateRequest.created_at.desc())
    )
    return [_to_response(dr) for dr in result.scalars().all()]


@router.get("/{request_id}", response_model=DateRequestResponse)
async def get_date_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DateRequest).where(DateRequest.id == request_id).options(*_load_options())
    )
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Date request not found")
    if dr.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return _to_response(dr)


@router.delete("/{request_id}", status_code=status.HTTP_200_OK)
async def cancel_date_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DateRequest).where(DateRequest.id == request_id)
    )
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Date request not found")
    if dr.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if dr.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending requests can be cancelled")

    dr.status = "cancelled"
    await db.commit()
    return {"message": "Date request cancelled"}


@router.patch("/{request_id}", response_model=DateRequestResponse)
async def update_date_request(
    request_id: uuid.UUID,
    data: DateRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DateRequest).where(DateRequest.id == request_id).options(*_load_options())
    )
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Date request not found")
    if dr.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if dr.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending requests can be updated")

    if data.activity is not None:
        dr.activity = data.activity.value

    if data.group_size is not None:
        dr.group_size = data.group_size

    if data.availability_slots is not None:
        # Delete old slots and create new ones
        for slot in dr.availability_slots:
            await db.delete(slot)
        for slot in data.availability_slots:
            db.add(AvailabilitySlot(
                date_request_id=dr.id,
                date=slot.date,
                time_window=slot.time_window.value if slot.time_window else None,
                time_hours=slot.get_hours(),
            ))

    if data.pre_group_friend_ids is not None:
        # Validate friends
        max_friends = ((data.group_size or dr.group_size) // 2) - 1
        if len(data.pre_group_friend_ids) > max_friends:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Max {max_friends} pre-group friend(s) for group of {data.group_size or dr.group_size}",
            )
        for friend_id in data.pre_group_friend_ids:
            result = await db.execute(select(User).where(User.id == friend_id))
            friend = result.scalar_one_or_none()
            if not friend:
                raise HTTPException(status_code=400, detail=f"Friend {friend_id} not found")
            if friend.gender != current_user.gender:
                raise HTTPException(status_code=400, detail="Pre-group friends must be the same gender")

        # Delete old friends and create new ones
        for f in dr.pre_group_friends:
            await db.delete(f)
        for friend_id in data.pre_group_friend_ids:
            db.add(PreGroupFriend(date_request_id=dr.id, friend_user_id=friend_id))

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(DateRequest).where(DateRequest.id == dr.id).options(*_load_options())
    )
    dr = result.scalar_one()
    return _to_response(dr)


# ── Templates ───────────────────────────────────────────────────────────────

@router.get("/templates/list")
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DateRequestTemplate)
        .where(DateRequestTemplate.user_id == current_user.id)
        .order_by(DateRequestTemplate.created_at.desc())
    )
    templates = list(result.scalars().all())
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "activities": t.activities,
            "group_size": t.group_size,
            "friend_ids": t.friend_ids,
            "created_at": t.created_at.isoformat(),
        }
        for t in templates
    ]


@router.post("/templates", status_code=201)
async def save_template(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = DateRequestTemplate(
        user_id=current_user.id,
        name=body.get("name", "My Template"),
        activities=body.get("activities", []),
        group_size=body.get("group_size", 4),
        friend_ids=body.get("friend_ids", []),
    )
    db.add(template)
    await db.commit()
    return {"id": str(template.id), "name": template.name}


@router.delete("/templates/{template_id}", status_code=200)
async def delete_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = await db.get(DateRequestTemplate, template_id)
    if not template or template.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()
    return {"detail": "Template deleted"}
