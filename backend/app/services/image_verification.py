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
                        "You are an image verification system for a dating app. "
                        "Analyze the provided photo and determine: "
                        "1) Does it contain a real human face? "
                        "2) Does it appear to be AI-generated (deepfake, midjourney, stable diffusion, etc)? "
                        "Respond ONLY with valid JSON: "
                        '{"is_human": bool, "is_ai_generated": bool, "confidence": float 0-1, "reason": "brief explanation"}'
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
        logger.error(f"Photo verification failed: {e}")
        return {"is_human": True, "is_ai_generated": False, "confidence": 0.0, "reason": f"Verification unavailable: {e}"}


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
                        "You are a face-matching verification system. "
                        "Analyze ALL provided photos and determine if they show the same person. "
                        "Respond ONLY with valid JSON: "
                        '{"same_person": bool, "confidence": float 0-1, "reason": "brief explanation"}'
                    ),
                },
                {"role": "user", "content": [{"type": "text", "text": "Are all these photos of the same person?"}, *image_content]},
            ],
            max_tokens=200,
        )

        content = response.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        return json.loads(content)

    except Exception as e:
        logger.error(f"Same-person verification failed: {e}")
        return {"same_person": True, "confidence": 0.0, "reason": f"Verification unavailable: {e}"}


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
        logger.error(f"Video selfie verification failed: {e}")
        return {
            "is_real_person": False,
            "is_live_video": False,
            "faces_match": False,
            "is_ai_generated": False,
            "confidence": 0.0,
            "reason": f"Verification unavailable: {e}",
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
        logger.error(f"Attractiveness scoring failed: {e}")
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
