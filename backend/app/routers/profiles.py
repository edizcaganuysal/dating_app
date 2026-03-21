import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User, VibeAnswer
from app.schemas.profile import (
    ProfileCreate,
    ProfileUpdate,
    PrivateProfileResponse,
    PublicProfileResponse,
)

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PrivateProfileResponse)
async def create_profile(
    data: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.bio = data.bio
    current_user.program = data.program
    current_user.year_of_study = data.year_of_study
    current_user.photo_urls = data.photo_urls
    current_user.interests = data.interests
    current_user.age_range_min = data.age_range_min
    current_user.age_range_max = data.age_range_max

    for va in data.vibe_answers:
        db.add(VibeAnswer(user_id=current_user.id, question=va.question, answer=va.answer))

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me", response_model=PrivateProfileResponse)
async def get_own_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=PrivateProfileResponse)
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=PublicProfileResponse)
async def get_user_profile(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/selfie-verify")
async def selfie_verify(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.is_selfie_verified = True
    await db.commit()
    return {"message": "Selfie verified"}
