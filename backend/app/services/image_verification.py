"""
Image & Video verification service using OpenAI Vision API.

Checks:
1. Photos contain real human faces (not AI-generated)
2. All profile photos are of the same person
3. Video selfie is a live recording of a real person
4. Video selfie person matches profile photos
"""

import base64
import json
import logging
import os
from typing import Optional

import cv2
import numpy as np
from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global client
    if client is None:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return client


def _image_to_base64(image_path: str) -> str:
    """Read an image file and return base64 encoded string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _bytes_to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("utf-8")


def extract_video_frames(video_path: str, num_frames: int = 3) -> list[bytes]:
    """Extract evenly-spaced frames from a video file using OpenCV."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames < num_frames:
        num_frames = max(1, total_frames)

    indices = [int(total_frames * i / (num_frames + 1)) for i in range(1, num_frames + 1)]

    frames = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            frames.append(buffer.tobytes())

    cap.release()
    return frames


async def verify_photo_is_human(image_path: str) -> dict:
    """
    Verify a single photo is a real human face, not AI-generated.

    Returns:
        {
            "is_human": bool,
            "is_ai_generated": bool,
            "has_clear_face": bool,
            "confidence": float (0-1),
            "reason": str
        }
    """
    try:
        ai = _get_client()
        b64 = _image_to_base64(image_path)

        response = await ai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict image verification system for a dating app. "
                        "Analyze the photo and check ALL of the following:\n"
                        "1) Does it contain a clearly visible real human face?\n"
                        "2) Does it appear to be AI-generated (deepfake, midjourney, stable diffusion, DALL-E, etc)?\n"
                        "3) Is it a meme, screenshot, cartoon, drawing, or non-photo image?\n"
                        "4) Is the face clearly visible and not obscured by objects, masks, or heavy filters?\n"
                        "5) Is it a group photo with multiple people? (only solo photos allowed)\n"
                        "6) Is it blurry or low quality to the point where the face cannot be verified?\n\n"
                        "The 'reason' field MUST be specific and user-friendly. Examples:\n"
                        "- 'No face detected — this appears to be a photo of a landscape with no person visible'\n"
                        "- 'This appears to be a screenshot of a social media post, not a personal photo'\n"
                        "- 'The face is too blurry to verify — please upload a clearer photo'\n"
                        "- 'This looks like an AI-generated portrait with unnatural skin texture and lighting'\n"
                        "- 'This is a group photo with multiple faces — please upload a photo of just yourself'\n"
                        "- 'This appears to be a cartoon or drawing, not a real photograph'\n"
                        "- 'This looks like a photo of a pet, not a person'\n"
                        "- 'This appears to be a photo of a screen or printed picture'\n\n"
                        "Respond ONLY with valid JSON: "
                        '{"is_human": bool, "is_ai_generated": bool, "has_clear_face": bool, "confidence": float 0-1, "reason": "specific user-friendly explanation of what is wrong or right"}'
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this photo:"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "high"},
                        },
                    ],
                },
            ],
            max_tokens=200,
        )

        content = response.choices[0].message.content or "{}"
        # Strip markdown code fences if present
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        return json.loads(content)

    except Exception as e:
        logger.error(f"[PHOTO CHECK] Photo verification failed: {e}")
        # FAIL CLOSED — reject on error, don't silently accept
        return {"is_human": False, "is_ai_generated": False, "has_clear_face": False, "confidence": 0.0, "reason": f"Could not verify this photo. Please try again. ({type(e).__name__})"}


async def verify_photos_same_person(photo_paths: list[str]) -> dict:
    """
    Verify that all profile photos show the same person.

    Returns:
        {
            "same_person": bool,
            "confidence": float (0-1),
            "reason": str
        }
    """
    if len(photo_paths) < 2:
        return {"same_person": True, "confidence": 1.0, "reason": "Only one photo provided"}

    try:
        ai = _get_client()
        image_content = []
        for i, path in enumerate(photo_paths[:6]):
            b64 = _image_to_base64(path)
            image_content.append({"type": "text", "text": f"Photo {i + 1}:"})
            image_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
            })

        response = await ai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict face-matching verification system for a dating app. "
                        "You MUST determine if ALL provided photos show the SAME person. "
                        "Look at facial features, bone structure, skin tone, hair, and overall appearance. "
                        "Different people = same_person: false. Same person in different settings/outfits = same_person: true. "
                        "Be STRICT — if you have any doubt, say false. This prevents catfishing.\n\n"
                        "If the photos show different people, explain which photos differ and why "
                        "(e.g., 'Photo 1 and Photo 3 appear to be different people — different facial structure and skin tone').\n\n"
                        "Respond ONLY with valid JSON (no markdown, no text before/after): "
                        '{"same_person": bool, "confidence": float 0-1, "reason": "specific explanation of what matches or differs between the faces"}'
                    ),
                },
                {"role": "user", "content": [{"type": "text", "text": "Check if ALL these photos show the same person. Be strict."}, *image_content]},
            ],
            max_tokens=200,
        )

        content = response.choices[0].message.content or ""
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        if not content:
            logger.error("[PHOTO CHECK] Same-person verification: empty response from API")
            return {"same_person": False, "confidence": 0.0, "reason": "Verification returned empty response. Please try again."}

        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            logger.error(f"[PHOTO CHECK] Same-person verification: invalid JSON: {content[:200]}")
            return {"same_person": False, "confidence": 0.0, "reason": "Verification failed to parse. Please try again."}

        logger.info(f"[PHOTO CHECK] Same-person check result: {result}")
        return result

    except Exception as e:
        logger.error(f"[PHOTO CHECK] Same-person verification failed: {e}")
        return {"same_person": False, "confidence": 0.0, "reason": f"Could not verify if photos match. Please try again. ({type(e).__name__})"}


async def verify_selfie_photo(selfie_path: str, photo_paths: list[str]) -> dict:
    """
    Comprehensive selfie photo verification using OpenAI Vision.

    Checks:
    1. Selfie is a real photo taken by a camera (not a photo of a screen/printout)
    2. Person is real (not AI-generated, not a mask, not a mannequin)
    3. No filters, face-altering apps, heavy editing, or beauty mode
    4. Face clearly visible and matches the profile photos
    5. Photo metadata consistency (lighting suggests live capture)

    Returns:
        {
            "is_real_person": bool,
            "is_live_photo": bool,
            "faces_match": bool,
            "is_ai_generated": bool,
            "has_filters": bool,
            "is_screen_capture": bool,
            "confidence": float (0-1),
            "reason": str,
            "auto_approve": bool
        }
    """
    try:
        ai = _get_client()
        selfie_b64 = _image_to_base64(selfie_path)

        content_parts = [
            {
                "type": "text",
                "text": (
                    "This is a selfie verification for a dating app. I'm providing:\n"
                    "1. A selfie photo (taken just now via front camera)\n"
                    "2. The user's profile photos\n\n"
                    "You MUST check ALL of these strictly:\n"
                    "- Is this a real human person? (not AI-generated, not a drawing, not a mannequin)\n"
                    "- Is this a live camera photo? (NOT a photo of a screen, NOT a photo of a printed picture, NOT a screenshot)\n"
                    "- Are there beauty filters, face-altering filters, or heavy editing? (Snapchat filters, FaceApp, beauty mode = FAIL)\n"
                    "- Is the person's face clearly visible and unobstructed?\n"
                    "- Does the selfie person match the profile photos? (compare facial features, not just hair/clothing)\n"
                    "- Does the lighting/environment look like a natural selfie? (screen glow on face = photo of screen)\n"
                    "- Is the lighting sufficient to verify identity? (too dark = reject)\n\n"
                    "Be VERY strict. This prevents catfishing. When in doubt, reject.\n\n"
                    "For the 'reason' field, be specific:\n"
                    "- 'Your selfie doesn't match your profile photos — different facial structure'\n"
                    "- 'This appears to be a photo of a screen, not a live selfie'\n"
                    "- 'Poor lighting — please take the selfie in a well-lit area'\n"
                    "- 'No face detected in selfie'\n"
                    "- 'Beauty filters detected — please remove all filters'\n"
                    "- 'This appears to be a printed photo, not a live selfie'"
                ),
            },
            {"type": "text", "text": "SELFIE (just taken):"},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{selfie_b64}", "detail": "high"},
            },
        ]

        for i, photo_path in enumerate(photo_paths[:4]):
            b64 = _image_to_base64(photo_path)
            content_parts.append({"type": "text", "text": f"Profile photo {i + 1}:"})
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
            })

        response = await ai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict identity verification system for a dating app. "
                        "Your job is to prevent catfishing, fake profiles, and AI-generated identities. "
                        "Respond ONLY with valid JSON:\n"
                        "{\n"
                        '  "is_real_person": bool,\n'
                        '  "is_live_photo": bool,\n'
                        '  "faces_match": bool,\n'
                        '  "is_ai_generated": bool,\n'
                        '  "has_filters": bool,\n'
                        '  "is_screen_capture": bool,\n'
                        '  "confidence": float 0-1,\n'
                        '  "reason": "brief specific explanation"\n'
                        "}"
                    ),
                },
                {"role": "user", "content": content_parts},
            ],
            max_tokens=300,
        )

        content = response.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        result = json.loads(content)

        auto_approve = (
            result.get("is_real_person", False)
            and result.get("is_live_photo", False)
            and result.get("faces_match", False)
            and not result.get("is_ai_generated", True)
            and not result.get("has_filters", True)
            and not result.get("is_screen_capture", True)
            and result.get("confidence", 0) >= 0.75
        )
        result["auto_approve"] = auto_approve

        logger.info(f"[PHOTO CHECK] Selfie verification result: approved={auto_approve}, confidence={result.get('confidence')}, reason={result.get('reason')}")
        return result

    except Exception as e:
        logger.error(f"[PHOTO CHECK] Selfie photo verification failed: {e}")
        return {
            "is_real_person": False,
            "is_live_photo": False,
            "faces_match": False,
            "is_ai_generated": False,
            "has_filters": False,
            "is_screen_capture": False,
            "confidence": 0.0,
            "reason": f"Selfie verification service encountered an error. Please try again with good lighting and a clear view of your face. ({type(e).__name__})",
            "auto_approve": False,
        }


async def verify_video_selfie(video_path: str, photo_paths: list[str]) -> dict:
    """
    Verify a video selfie for liveness detection and face matching.

    Extracts frames from the video and sends them alongside profile photos
    to OpenAI Vision for comprehensive verification.

    Returns:
        {
            "is_real_person": bool,
            "is_live_video": bool,
            "faces_match": bool,
            "is_ai_generated": bool,
            "confidence": float (0-1),
            "reason": str,
            "auto_approve": bool
        }
    """
    try:
        # Extract frames from video
        frames = extract_video_frames(video_path, num_frames=3)
        if not frames:
            return {
                "is_real_person": False,
                "is_live_video": False,
                "faces_match": False,
                "is_ai_generated": False,
                "confidence": 0.0,
                "reason": "Could not extract frames from video",
                "auto_approve": False,
            }

        ai = _get_client()

        # Build content with video frames and profile photos
        content_parts = [
            {
                "type": "text",
                "text": (
                    "This is a selfie verification for a dating app. "
                    "I'm providing 3 frames extracted from a short selfie video, followed by the user's profile photos. "
                    "Analyze carefully and determine:\n"
                    "1. Is this a real human person in the video frames? (not a photo of a photo, not a screen recording)\n"
                    "2. Is this a live video? (look for natural movement, different expressions/angles across the 3 frames)\n"
                    "3. Does the person in the video match the person in the profile photos?\n"
                    "4. Do the video frames or photos appear to be AI-generated?\n"
                    "Be strict — this is identity verification."
                ),
            },
        ]

        # Add video frames
        for i, frame_bytes in enumerate(frames):
            b64 = _bytes_to_base64(frame_bytes)
            content_parts.append({"type": "text", "text": f"Video frame {i + 1} of 3:"})
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "high"},
            })

        # Add profile photos
        for i, photo_path in enumerate(photo_paths[:4]):
            b64 = _image_to_base64(photo_path)
            content_parts.append({"type": "text", "text": f"Profile photo {i + 1}:"})
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
            })

        response = await ai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict identity verification system for a dating app. "
                        "You must verify that selfie videos are real, live, and match profile photos. "
                        "Respond ONLY with valid JSON:\n"
                        "{\n"
                        '  "is_real_person": bool,\n'
                        '  "is_live_video": bool,\n'
                        '  "faces_match": bool,\n'
                        '  "is_ai_generated": bool,\n'
                        '  "confidence": float 0-1,\n'
                        '  "reason": "brief explanation"\n'
                        "}"
                    ),
                },
                {"role": "user", "content": content_parts},
            ],
            max_tokens=300,
        )

        content = response.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        result = json.loads(content)

        # Determine auto-approve
        auto_approve = (
            result.get("is_real_person", False)
            and result.get("is_live_video", False)
            and result.get("faces_match", False)
            and not result.get("is_ai_generated", True)
            and result.get("confidence", 0) >= 0.8
        )
        result["auto_approve"] = auto_approve

        return result

    except Exception as e:
        logger.error(f"[PHOTO CHECK] Video selfie verification failed: {e}")
        return {
            "is_real_person": False,
            "is_live_video": False,
            "faces_match": False,
            "is_ai_generated": False,
            "confidence": 0.0,
            "reason": f"Video verification service encountered an error. Please try again with good lighting and a clear view of your face. ({type(e).__name__})",
            "auto_approve": False,
        }


async def score_attractiveness(image_path: str) -> dict:
    """
    Score a profile photo on attractiveness dimensions using OpenAI Vision.
    Accounts for photo quality (lighting, angle) separately.

    Returns:
        {
            "score": float (1-10, overall attractiveness),
            "photo_quality": float (1-10, how good the photo itself is),
            "grooming": float (1-10),
            "style": float (1-10),
            "confidence": float (0-1)
        }
    """
    if not settings.OPENAI_API_KEY:
        return {"score": 5.0, "photo_quality": 5.0, "grooming": 5.0, "style": 5.0, "confidence": 0.0}

    try:
        ai = _get_client()
        b64 = _image_to_base64(image_path)

        response = await ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a photo quality and attractiveness scoring system for a dating app's matching algorithm. "
                        "Your scores are used ONLY internally for matching people of similar attractiveness — they are NEVER shown to users. "
                        "Score on a 1-10 scale. Be fair and consistent. Account for photo quality issues "
                        "(bad lighting, unflattering angle, low resolution) by scoring photo_quality separately. "
                        "A person can have high attractiveness but low photo_quality if the photo is poorly taken. "
                        "Respond ONLY with valid JSON: "
                        '{"score": float, "photo_quality": float, "grooming": float, "style": float, "confidence": float 0-1}'
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Rate this dating profile photo:"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
                        },
                    ],
                },
            ],
            max_tokens=100,
        )

        content = response.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        result = json.loads(content)

        # Adjust: if photo quality is low, bump up the attractiveness score slightly
        # (bad photo ≠ bad looking)
        photo_q = result.get("photo_quality", 5.0)
        raw_score = result.get("score", 5.0)
        if photo_q < 4.0:
            result["score"] = min(10.0, raw_score + (4.0 - photo_q) * 0.3)

        return result

    except Exception as e:
        logger.error(f"[PHOTO CHECK] Attractiveness scoring failed: {e}")
        return {"score": 5.0, "photo_quality": 5.0, "grooming": 5.0, "style": 5.0, "confidence": 0.0}


async def score_user_photos(photo_paths: list[str]) -> float:
    """Score multiple photos and return the average attractiveness score."""
    if not photo_paths:
        return 5.0

    scores = []
    for path in photo_paths[:4]:  # Score up to 4 photos
        if os.path.exists(path):
            result = await score_attractiveness(path)
            scores.append(result.get("score", 5.0))

    return sum(scores) / len(scores) if scores else 5.0


async def verify_all_photos_and_selfie(photo_paths: list[str], selfie_path: str | None = None) -> dict:
    """
    Final cross-check of ALL photos + selfie together.
    Sends every image to OpenAI Vision in one request for a comprehensive consistency check.

    Returns:
        {
            "all_match": bool,
            "confidence": float (0-1),
            "issues": [{"photo_index": int, "issue": str}, ...],
            "reason": str
        }
    """
    all_paths = list(photo_paths)
    if selfie_path:
        all_paths.append(selfie_path)

    if len(all_paths) < 2:
        return {"all_match": True, "confidence": 1.0, "issues": [], "reason": "Not enough photos to cross-check."}

    try:
        ai = _get_client()

        image_content = []
        labels = []
        for i, path in enumerate(photo_paths[:6]):
            b64 = _image_to_base64(path)
            label = f"Profile photo {i + 1}"
            labels.append(label)
            image_content.append({"type": "text", "text": f"{label}:"})
            image_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
            })

        if selfie_path:
            b64 = _image_to_base64(selfie_path)
            labels.append("Selfie")
            image_content.append({"type": "text", "text": "Verification selfie:"})
            image_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "high"},
            })

        response = await ai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict identity verification system for a dating app. "
                        "You are given ALL of a user's profile photos and optionally their verification selfie. "
                        "Your job is a FINAL cross-check to ensure:\n"
                        "1. ALL photos show the SAME person\n"
                        "2. If a selfie is included, it matches ALL the profile photos\n"
                        "3. No AI-generated images are present\n"
                        "4. No screenshots, cartoons, or non-photo images\n\n"
                        "If any photo doesn't match, identify WHICH photo(s) are problematic. "
                        "Use 0-based indexing for photo_index (0 = first profile photo, etc.). "
                        "If the selfie doesn't match, use the index after all profile photos.\n\n"
                        "Respond ONLY with valid JSON:\n"
                        "{\n"
                        '  "all_match": bool,\n'
                        '  "confidence": float 0-1,\n'
                        '  "issues": [{"photo_index": int, "issue": "specific problem"}],\n'
                        '  "reason": "overall summary"\n'
                        "}"
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Cross-check all {len(all_paths)} images. Labels: {', '.join(labels)}. Be strict."},
                        *image_content,
                    ],
                },
            ],
            max_tokens=400,
        )

        content = response.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        result = json.loads(content)
        logger.info(f"[PHOTO CHECK] Full cross-check result: {result}")
        return result

    except Exception as e:
        logger.error(f"[PHOTO CHECK] Full cross-check failed: {e}")
        return {
            "all_match": False,
            "confidence": 0.0,
            "issues": [],
            "reason": f"Cross-check verification failed. Please try again. ({type(e).__name__})",
        }
