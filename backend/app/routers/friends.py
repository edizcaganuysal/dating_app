import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.friendship import Friendship
from app.models.user import User
from app.schemas.friendship import (
    FriendCodeAdd,
    FriendRequestCreate,
    FriendResponse,
    FriendSearchResult,
    FriendshipResponse,
)

router = APIRouter(prefix="/api/friends", tags=["friends"])


@router.get("", response_model=list[FriendResponse])
async def list_friends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all accepted friends."""
    result = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.status == "accepted"),
                and_(Friendship.friend_id == current_user.id, Friendship.status == "accepted"),
            )
        )
    )
    friendships = list(result.scalars().all())

    friends = []
    for f in friendships:
        friend_uid = f.friend_id if f.user_id == current_user.id else f.user_id
        user = await db.get(User, friend_uid)
        if user:
            friends.append(FriendResponse(
                id=f.id,
                user_id=user.id,
                first_name=user.first_name,
                last_name=user.last_name,
                gender=user.gender,
                age=user.age,
                program=user.program,
                photo_urls=user.photo_urls or [],
            ))
    return friends


@router.post("/request", status_code=201)
async def send_friend_request(
    body: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a friend request."""
    if body.friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself.")

    # Check friend exists
    friend = await db.get(User, body.friend_id)
    if not friend:
        raise HTTPException(status_code=404, detail="User not found.")

    # Check if already friends or pending
    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == body.friend_id),
                and_(Friendship.user_id == body.friend_id, Friendship.friend_id == current_user.id),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Friend request already exists.")

    friendship = Friendship(user_id=current_user.id, friend_id=body.friend_id, status="pending")
    db.add(friendship)
    await db.commit()
    return {"id": str(friendship.id), "status": "pending"}


@router.post("/accept/{friendship_id}", status_code=200)
async def accept_friend_request(
    friendship_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friendship = await db.get(Friendship, friendship_id)
    if not friendship or friendship.friend_id != current_user.id:
        raise HTTPException(status_code=404, detail="Friend request not found.")
    if friendship.status != "pending":
        raise HTTPException(status_code=400, detail="Request already handled.")

    friendship.status = "accepted"
    await db.commit()
    return {"id": str(friendship.id), "status": "accepted"}


@router.post("/reject/{friendship_id}", status_code=200)
async def reject_friend_request(
    friendship_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friendship = await db.get(Friendship, friendship_id)
    if not friendship or friendship.friend_id != current_user.id:
        raise HTTPException(status_code=404, detail="Friend request not found.")

    await db.delete(friendship)
    await db.commit()
    return {"detail": "Request rejected."}


@router.get("/pending", response_model=list[FriendshipResponse])
async def list_pending_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List incoming pending friend requests."""
    result = await db.execute(
        select(Friendship).where(
            Friendship.friend_id == current_user.id,
            Friendship.status == "pending",
        )
    )
    friendships = list(result.scalars().all())
    responses = []
    for f in friendships:
        sender = await db.get(User, f.user_id)
        responses.append(FriendshipResponse(
            id=f.id,
            user_id=f.user_id,
            friend_id=f.friend_id,
            status=f.status,
            created_at=f.created_at,
            friend_name=f"{sender.first_name} {sender.last_name}" if sender else "Unknown",
        ))
    return responses


@router.post("/code", status_code=200)
async def add_friend_by_code(
    body: FriendCodeAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a friend by their invite code. Instantly accepted."""
    result = await db.execute(select(User).where(User.friend_code == body.code.upper().strip()))
    friend = result.scalar_one_or_none()
    if not friend:
        raise HTTPException(status_code=404, detail="Invalid friend code.")
    if friend.id == current_user.id:
        raise HTTPException(status_code=400, detail="That's your own code.")

    # Check existing
    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend.id),
                and_(Friendship.user_id == friend.id, Friendship.friend_id == current_user.id),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already friends.")

    friendship = Friendship(user_id=current_user.id, friend_id=friend.id, status="accepted")
    db.add(friendship)
    await db.commit()
    return {"id": str(friendship.id), "friend_name": f"{friend.first_name} {friend.last_name}", "status": "accepted"}


@router.get("/my-code")
async def get_my_code(current_user: User = Depends(get_current_user)):
    return {"code": current_user.friend_code}


@router.delete("/{friendship_id}", status_code=200)
async def remove_friend(
    friendship_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friendship = await db.get(Friendship, friendship_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found.")
    if friendship.user_id != current_user.id and friendship.friend_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your friendship.")

    await db.delete(friendship)
    await db.commit()
    return {"detail": "Friend removed."}


@router.get("/search", response_model=list[FriendSearchResult])
async def search_users(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search for users by name or email."""
    pattern = f"%{q}%"
    result = await db.execute(
        select(User).where(
            User.id != current_user.id,
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.email.ilike(pattern),
            ),
        ).limit(10)
    )
    return list(result.scalars().all())
