import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User, VibeAnswer
from app.schemas.profile import (
    LocationUpdate,
    ProfileCreate,
    ProfileUpdate,
    PrivateProfileResponse,
    PublicProfileResponse,
)
from app.services.image_verification import (
    score_attractiveness,
    score_user_photos,
    verify_photo_is_human,
    verify_photos_same_person,
    verify_selfie_photo,
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

    # Location
    if data.latitude is not None and data.longitude is not None:
        current_user.latitude = data.latitude
        current_user.longitude = data.longitude
        current_user.location_updated_at = datetime.now(timezone.utc)
    if data.preferred_max_distance_km is not None:
        current_user.preferred_max_distance_km = data.preferred_max_distance_km

    # Self-description
    if data.body_type:
        current_user.body_type = data.body_type
    if data.height_cm is not None:
        current_user.height_cm = data.height_cm
    if data.style_tags:
        current_user.style_tags = data.style_tags

    # Preferences about others
    if data.pref_body_type:
        current_user.pref_body_type = data.pref_body_type
    if data.pref_height_range:
        current_user.pref_height_range = data.pref_height_range
    if data.pref_style:
        current_user.pref_style = data.pref_style
    if data.pref_social_energy_range:
        current_user.pref_social_energy_range = data.pref_social_energy_range
    if data.pref_humor_styles:
        current_user.pref_humor_styles = data.pref_humor_styles
    if data.pref_communication:
        current_user.pref_communication = data.pref_communication

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

        # Score attractiveness across all photos
        if photo_paths:
            avg_score = await score_user_photos(photo_paths)
            current_user.attractiveness_score = round(avg_score, 1)
            print(f"[ATTRACTIVENESS] {current_user.email} final score: {current_user.attractiveness_score}")

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

    photos_changed = "photo_urls" in update_data

    for field, value in update_data.items():
        setattr(current_user, field, value)

    # Re-score attractiveness when photos change
    if photos_changed and settings.OPENAI_API_KEY and current_user.photo_urls:
        photo_paths = []
        for url in current_user.photo_urls[:6]:
            path = os.path.join(UPLOADS_DIR, os.path.basename(url))
            if os.path.exists(path):
                photo_paths.append(path)
        if photo_paths:
            avg_score = await score_user_photos(photo_paths)
            current_user.attractiveness_score = round(avg_score, 1)
            print(f"[ATTRACTIVENESS] {current_user.email} re-scored: {current_user.attractiveness_score}")

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
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"/uploads/{filename}"

    # Run AI verification if API key is configured
    verification = {}
    if settings.OPENAI_API_KEY:
        result = await verify_photo_is_human(filepath)
        verification = result
        ai_generated = result.get("is_ai_generated", False)
        is_human = result.get("is_human", True)
        confidence = result.get("confidence", 0)
        reason = result.get("reason", "")

        if ai_generated and confidence >= 0.7:
            os.remove(filepath)
            raise HTTPException(
                status_code=400,
                detail=f"This photo appears to be AI-generated. {reason}. Please upload a real photo.",
            )

        if not is_human and confidence >= 0.7:
            os.remove(filepath)
            raise HTTPException(
                status_code=400,
                detail=f"No face detected in this photo. {reason}. Please upload a clear photo showing your face.",
            )

        # Compare with existing photos to ensure same person
        if current_user.photo_urls:
            existing_paths = []
            for existing_url in current_user.photo_urls[:4]:
                epath = os.path.join(UPLOADS_DIR, os.path.basename(existing_url))
                if os.path.exists(epath):
                    existing_paths.append(epath)

            if existing_paths:
                all_paths = existing_paths + [filepath]
                same_result = await verify_photos_same_person(all_paths)
                verification["same_person_check"] = same_result

                if not same_result.get("same_person", True) and same_result.get("confidence", 0) >= 0.75:
                    os.remove(filepath)
                    raise HTTPException(
                        status_code=400,
                        detail=f"This photo doesn't match your other photos. {same_result.get('reason', 'All photos must be of the same person.')}",
                    )

    # Score attractiveness
    attractiveness_result = None
    if settings.OPENAI_API_KEY:
        attractiveness_result = await score_attractiveness(filepath)
        verification["attractiveness"] = attractiveness_result
        print(f"[ATTRACTIVENESS] {current_user.email} photo score: {attractiveness_result}")

    return {"url": url, "filename": filename, "verification": verification}


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
    filename = f"selfie_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
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

    # Comprehensive selfie photo verification
    if settings.OPENAI_API_KEY and current_user.photo_urls and is_image:
        photo_paths = []
        for url in current_user.photo_urls[:4]:
            path = os.path.join(UPLOADS_DIR, os.path.basename(url))
            if os.path.exists(path):
                photo_paths.append(path)

        if photo_paths:
            verification_result = await verify_selfie_photo(filepath, photo_paths)

            is_verified = verification_result.get("auto_approve", False)

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
                # Build specific failure message based on what went wrong
                issues = []
                if verification_result.get("is_ai_generated"):
                    issues.append("This image appears to be AI-generated or digitally created.")
                if verification_result.get("is_screen_capture"):
                    issues.append("This looks like a photo of a screen or printed picture, not a live selfie.")
                if verification_result.get("has_filters"):
                    issues.append("Beauty filters or face-altering effects were detected. Remove all filters.")
                if not verification_result.get("is_real_person", True):
                    issues.append("No real human face was clearly detected in this photo.")
                if not verification_result.get("is_live_photo", True):
                    issues.append("This doesn't appear to be a live photo taken just now.")
                if not verification_result.get("faces_match", True):
                    issues.append("The person in this selfie doesn't match your profile photos.")

                if issues:
                    reason = " ".join(issues) + " Please try again."
                else:
                    reason = verification_result.get("reason", "Verification failed. Please try again with better lighting and no filters.")
                await db.commit()
                return {
                    "message": reason,
                    "selfie_url": selfie_url,
                    "status": "rejected",
                    "verification": verification_result,
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


@router.patch("/me/location")
async def update_location(
    data: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's location. Called from background or map picker."""
    current_user.latitude = data.latitude
    current_user.longitude = data.longitude
    current_user.location_updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Location updated"}
