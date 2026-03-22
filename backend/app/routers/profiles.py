import os
import uuid as uuid_mod
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User, VibeAnswer
from app.schemas.profile import (
    ProfileCreate,
    ProfileUpdate,
    PrivateProfileResponse,
    PublicProfileResponse,
)
from app.services.image_verification import (
    verify_photo_is_human,
    verify_photos_same_person,
    verify_video_selfie,
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

    # Run AI verification on profile photos if API key configured
    if settings.OPENAI_API_KEY and current_user.photo_urls:
        photo_paths = []
        for url in current_user.photo_urls[:6]:
            path = os.path.join(UPLOADS_DIR, os.path.basename(url))
            if os.path.exists(path):
                photo_paths.append(path)

        if len(photo_paths) >= 2:
            same_result = await verify_photos_same_person(photo_paths)
            if not same_result.get("same_person", True) and same_result.get("confidence", 0) >= 0.8:
                raise HTTPException(
                    status_code=400,
                    detail="Your photos don't appear to show the same person. Please upload photos of yourself.",
                )

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
    """Upload a profile photo. Runs AI verification to ensure it's a real human."""
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

    # Run AI verification if API key is configured
    if settings.OPENAI_API_KEY:
        result = await verify_photo_is_human(filepath)
        ai_generated = result.get("is_ai_generated", False)
        is_human = result.get("is_human", True)
        confidence = result.get("confidence", 0)

        if ai_generated and confidence >= 0.7:
            os.remove(filepath)
            raise HTTPException(
                status_code=400,
                detail="This photo appears to be AI-generated. Please upload a real photo of yourself.",
            )

        if not is_human and confidence >= 0.7:
            os.remove(filepath)
            raise HTTPException(
                status_code=400,
                detail="This photo doesn't appear to contain a person. Please upload a clear photo of yourself.",
            )

    return {"url": url, "filename": filename}


@router.post("/selfie-verify")
async def selfie_verify(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a video selfie for verification.
    Accepts both video and image files.
    Uses AI to verify liveness, identity match, and detect AI generation.
    """
    content_type = file.content_type or ""
    is_video = content_type.startswith("video/")
    is_image = content_type.startswith("image/")

    if not is_video and not is_image:
        raise HTTPException(status_code=400, detail="File must be a video or image.")

    contents = await file.read()
    max_size = 50 * 1024 * 1024 if is_video else 10 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File must be under {max_size // (1024 * 1024)}MB.",
        )

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else ("mp4" if is_video else "jpg")
    filename = f"selfie_{current_user.id}_{uuid_mod.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    selfie_url = f"/uploads/{filename}"
    current_user.selfie_urls = (current_user.selfie_urls or []) + [selfie_url]

    # Run AI verification — always gives a definitive answer
    if settings.OPENAI_API_KEY and current_user.photo_urls:
        photo_paths = []
        for url in current_user.photo_urls[:4]:
            path = os.path.join(UPLOADS_DIR, os.path.basename(url))
            if os.path.exists(path):
                photo_paths.append(path)

        if photo_paths and is_video:
            verification_result = await verify_video_selfie(filepath, photo_paths)

            is_verified = (
                verification_result.get("is_real_person", False)
                and verification_result.get("faces_match", False)
                and not verification_result.get("is_ai_generated", True)
                and verification_result.get("confidence", 0) >= 0.6
            )

            if is_verified:
                current_user.selfie_status = "verified"
                current_user.is_selfie_verified = True
                await db.commit()
                return {
                    "message": "Identity confirmed.",
                    "selfie_url": selfie_url,
                    "status": "verified",
                    "verification": verification_result,
                }
            else:
                current_user.selfie_status = "rejected"
                current_user.is_selfie_verified = False
                await db.commit()
                reason = verification_result.get("reason", "We couldn't verify your identity.")
                return {
                    "message": reason,
                    "selfie_url": selfie_url,
                    "status": "rejected",
                    "verification": verification_result,
                }

    # Fallback for image selfie or no API key — still auto-verify via AI if possible
    if settings.OPENAI_API_KEY and current_user.photo_urls and is_image:
        photo_paths = []
        for url in current_user.photo_urls[:4]:
            path = os.path.join(UPLOADS_DIR, os.path.basename(url))
            if os.path.exists(path):
                photo_paths.append(path)

        if photo_paths:
            same_result = await verify_photos_same_person([filepath] + photo_paths)
            if same_result.get("same_person", False) and same_result.get("confidence", 0) >= 0.6:
                current_user.selfie_status = "verified"
                current_user.is_selfie_verified = True
                await db.commit()
                return {
                    "message": "Identity confirmed.",
                    "selfie_url": selfie_url,
                    "status": "verified",
                }
            else:
                current_user.selfie_status = "rejected"
                current_user.is_selfie_verified = False
                await db.commit()
                return {
                    "message": same_result.get("reason", "Your selfie doesn't match your profile photos."),
                    "selfie_url": selfie_url,
                    "status": "rejected",
                }

    # No API key configured — accept and mark verified (dev mode)
    current_user.selfie_status = "verified"
    current_user.is_selfie_verified = True
    await db.commit()

    return {
        "message": "Identity confirmed.",
        "selfie_url": selfie_url,
        "status": "verified",
    }
