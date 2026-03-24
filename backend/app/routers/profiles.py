import logging
import os
import uuid

logger = logging.getLogger(__name__)
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
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

    # Auto-generate bio from prompts if not provided
    if data.bio:
        current_user.bio = data.bio
    elif data.prompts and not current_user.bio:
        current_user.bio = " | ".join(f"{p.prompt} {p.answer}" for p in data.prompts[:2])

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


@router.post("/verify-photos-batch")
async def verify_photos_batch(
    data: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Cross-check ALL uploaded photos at once to ensure they show the same person.
    Called when user finishes uploading all photos (before moving to next step).
    Body: {"photo_urls": ["/uploads/xxx.jpg", "/uploads/yyy.jpg", ...]}
    """
    photo_urls = data.get("photo_urls", [])
    if len(photo_urls) < 2:
        return {"same_person": True, "confidence": 1.0, "reason": "Only one photo, nothing to compare."}

    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="Verification service unavailable.")

    photo_paths = []
    for url in photo_urls[:6]:
        path = os.path.join(UPLOADS_DIR, os.path.basename(url))
        if os.path.exists(path):
            photo_paths.append(path)

    if len(photo_paths) < 2:
        return {"same_person": True, "confidence": 1.0, "reason": "Not enough photos found on server to compare."}

    result = await verify_photos_same_person(photo_paths)
    logger.info(f"[BATCH CHECK] {current_user.email}: {len(photo_paths)} photos, result={result}")

    if not result.get("same_person", True):
        raise HTTPException(
            status_code=400,
            detail=f"Your photos don't all show the same person. {result.get('reason', 'Please make sure all photos are of you.')}",
        )

    return result


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    existing_urls: str = Form(""),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a profile photo. Runs AI verification:
    1. Is it a real human face? (not AI, not screenshot, not blurry)
    2. Does it match previously uploaded photos? (same person check)

    Pass existing_urls as comma-separated list of previously uploaded URLs
    (from onboarding, before profile is created) so we can cross-check.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPEG, PNG, etc.)")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 10MB.")

    # Check for duplicate upload (same file hash)
    import hashlib
    file_hash = hashlib.md5(contents).hexdigest()

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"/uploads/{filename}"

    # Collect ALL existing photo paths: from saved profile + from onboarding session
    all_existing_paths = []

    # From saved profile (for editing existing profile)
    if current_user.photo_urls:
        for existing_url in current_user.photo_urls[:6]:
            epath = os.path.join(UPLOADS_DIR, os.path.basename(existing_url))
            if os.path.exists(epath):
                all_existing_paths.append(epath)

    # From onboarding session (passed by frontend)
    logger.info(f"[UPLOAD] {current_user.email}: existing_urls='{existing_urls}', saved_photos={len(all_existing_paths)}")
    if existing_urls:
        for existing_url in existing_urls.split(","):
            existing_url = existing_url.strip()
            if existing_url:
                epath = os.path.join(UPLOADS_DIR, os.path.basename(existing_url))
                if os.path.exists(epath):
                    # Check for duplicate (same file)
                    with open(epath, "rb") as ef:
                        existing_hash = hashlib.md5(ef.read()).hexdigest()
                    if existing_hash == file_hash:
                        os.remove(filepath)
                        raise HTTPException(
                            status_code=400,
                            detail="You've already uploaded this exact photo. Please choose a different one.",
                        )
                    all_existing_paths.append(epath)

    # Run AI verification
    verification = {}
    if settings.OPENAI_API_KEY:
        # Step 1: Is this a real human photo?
        result = await verify_photo_is_human(filepath)
        verification["human_check"] = result
        ai_generated = result.get("is_ai_generated", False)
        is_human = result.get("is_human", True)
        has_clear_face = result.get("has_clear_face", True)
        confidence = result.get("confidence", 0)
        reason = result.get("reason", "Unknown issue")

        logger.info(f"[PHOTO CHECK] {current_user.email}: human={is_human}, ai={ai_generated}, face={has_clear_face}, conf={confidence}, reason={reason}")

        if ai_generated and confidence >= 0.6:
            os.remove(filepath)
            raise HTTPException(status_code=400, detail=reason)

        if not is_human and confidence >= 0.6:
            os.remove(filepath)
            raise HTTPException(status_code=400, detail=reason)

        if not has_clear_face and confidence >= 0.6:
            os.remove(filepath)
            raise HTTPException(status_code=400, detail=reason)

        # Step 2: Does this photo match existing photos? (same person)
        if all_existing_paths:
            compare_paths = all_existing_paths[:4] + [filepath]
            same_result = await verify_photos_same_person(compare_paths)
            verification["same_person_check"] = same_result

            logger.info(f"[SAME PERSON] {current_user.email}: same={same_result.get('same_person')}, conf={same_result.get('confidence')}, reason={same_result.get('reason')}")

            if not same_result.get("same_person", True) and same_result.get("confidence", 0) >= 0.5:
                os.remove(filepath)
                raise HTTPException(
                    status_code=400,
                    detail=f"This doesn't look like the same person as your other photos. {same_result.get('reason', '')}",
                )

        # Step 3: Score attractiveness
        attractiveness_result = await score_attractiveness(filepath)
        verification["attractiveness"] = attractiveness_result
        print(f"[ATTRACTIVENESS] {current_user.email} photo score: {attractiveness_result}")
    else:
        logger.warning("[PHOTO CHECK] OPENAI_API_KEY not set — skipping ALL verification!")

    return {"url": url, "filename": filename, "verification": verification}


@router.post("/selfie-verify")
async def selfie_verify(
    file: UploadFile = File(...),
    photo_urls: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a selfie for verification.
    Accepts image files. Compares against profile photos.
    Pass photo_urls as comma-separated list of uploaded photo URLs for comparison.
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

    # Collect photo paths from saved profile + onboarding session
    photo_paths = []
    for url in (current_user.photo_urls or [])[:4]:
        path = os.path.join(UPLOADS_DIR, os.path.basename(url))
        if os.path.exists(path):
            photo_paths.append(path)
    # From onboarding (frontend passes these)
    if photo_urls:
        for url in photo_urls.split(","):
            url = url.strip()
            if url:
                path = os.path.join(UPLOADS_DIR, os.path.basename(url))
                if os.path.exists(path):
                    photo_paths.append(path)

    if not photo_paths:
        os.remove(filepath)
        raise HTTPException(status_code=400, detail="Please upload at least one profile photo before selfie verification.")

    # Run AI verification
    if not settings.OPENAI_API_KEY:
        logger.warning("[SELFIE] OPENAI_API_KEY not set — cannot verify!")
        raise HTTPException(status_code=500, detail="Verification service unavailable. Please try again later.")

    logger.info(f"[SELFIE] {current_user.email}: verifying against {len(photo_paths)} photos, is_image={is_image}")

    # Run verification
    if is_image:
        verification_result = await verify_selfie_photo(filepath, photo_paths)
    else:
        verification_result = await verify_video_selfie(filepath, photo_paths)

    logger.info(f"[SELFIE] {current_user.email}: result={verification_result}")

    # Check if auto-approved
    is_verified = verification_result.get("auto_approve", False)
    if not is_verified and is_image:
        # For photos, check individual fields
        is_verified = (
            verification_result.get("is_real_person", False)
            and verification_result.get("is_live_photo", False)
            and verification_result.get("faces_match", False)
            and not verification_result.get("is_ai_generated", True)
            and not verification_result.get("has_filters", True)
            and not verification_result.get("is_screen_capture", True)
            and verification_result.get("confidence", 0) >= 0.7
        )
    elif not is_verified and is_video:
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

    # Build specific failure message
    current_user.selfie_status = "rejected"
    current_user.is_selfie_verified = False
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

    reason = (" ".join(issues) + " Please try again.") if issues else verification_result.get("reason", "Verification failed. Please try again with better lighting and no filters.")
    await db.commit()
    return {
        "message": reason,
        "selfie_url": selfie_url,
        "status": "rejected",
        "verification": verification_result,
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
