import os
import uuid as uuid_mod
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
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

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PrivateProfileResponse)
async def create_profile(
    data: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Core fields
    current_user.onboarding_path = data.onboarding_path
    current_user.program = data.program
    current_user.year_of_study = data.year_of_study
    current_user.relationship_intent = data.relationship_intent
    current_user.photo_urls = data.photo_urls
    current_user.interests = data.interests
    current_user.prompts = [p.model_dump() for p in data.prompts] if data.prompts else []
    current_user.age_range_min = data.age_range_min
    current_user.age_range_max = data.age_range_max

    # Legacy bio compat
    if data.bio:
        current_user.bio = data.bio

    # Thorough-only fields
    if data.social_energy is not None:
        current_user.social_energy = data.social_energy
    if data.humor_styles:
        current_user.humor_styles = data.humor_styles
    if data.communication_pref:
        current_user.communication_pref = data.communication_pref
    if data.conflict_style:
        current_user.conflict_style = data.conflict_style
    if data.drinking:
        current_user.drinking = data.drinking
    if data.smoking:
        current_user.smoking = data.smoking
    if data.exercise:
        current_user.exercise = data.exercise
    if data.diet:
        current_user.diet = data.diet
    if data.sleep_schedule:
        current_user.sleep_schedule = data.sleep_schedule
    if data.group_role:
        current_user.group_role = data.group_role
    if data.ideal_group_size:
        current_user.ideal_group_size = data.ideal_group_size
    if data.dealbreakers:
        current_user.dealbreakers = data.dealbreakers

    # Vibe answers
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
    # Convert prompts to dicts if present
    if "prompts" in update_data and update_data["prompts"]:
        update_data["prompts"] = [p if isinstance(p, dict) else p.model_dump() for p in update_data["prompts"]]
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


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a profile photo. Returns the URL of the uploaded file."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPEG, PNG, etc.)")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 10MB.")

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid_mod.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"/uploads/{filename}"
    return {"url": url, "filename": filename}


@router.post("/selfie-verify")
async def selfie_verify(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a selfie for verification. Sets status to pending for admin review."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 10MB.")

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"selfie_{current_user.id}_{uuid_mod.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    selfie_url = f"/uploads/{filename}"
    current_user.selfie_urls = (current_user.selfie_urls or []) + [selfie_url]
    current_user.selfie_status = "pending"
    current_user.is_selfie_verified = False  # Not verified until admin approves
    await db.commit()

    return {"message": "Selfie uploaded. Verification pending admin review.", "selfie_url": selfie_url, "status": "pending"}
