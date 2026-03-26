"""
Push notification service using Expo Push Notifications API.
Sends notifications to users via their registered Expo push tokens.
"""

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_notification(
    push_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """Send a single push notification via Expo."""
    if not push_token or not push_token.startswith("ExponentPushToken["):
        return False

    payload = {
        "to": push_token,
        "title": title,
        "body": body,
        "sound": "default",
    }
    if data:
        payload["data"] = data

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10.0,
            )
            if response.status_code == 200:
                return True
            logger.warning(f"Push notification failed: {response.status_code} {response.text}")
            return False
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return False


async def send_push_to_many(
    push_tokens: list[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> int:
    """Send push notification to multiple tokens. Returns count of successful sends."""
    messages = []
    for token in push_tokens:
        if token and token.startswith("ExponentPushToken["):
            msg = {
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
            }
            if data:
                msg["data"] = data
            messages.append(msg)

    if not messages:
        return 0

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Content-Type": "application/json"},
                timeout=15.0,
            )
            if response.status_code == 200:
                return len(messages)
            logger.warning(f"Batch push failed: {response.status_code}")
            return 0
    except Exception as e:
        logger.error(f"Batch push error: {e}")
        return 0


async def notify_group_reveal(
    push_token: str,
    activity: str,
    group_id: str,
) -> bool:
    """Notify a user that their group date has been confirmed."""
    return await send_push_notification(
        push_token=push_token,
        title="Your group date is set! 🎉",
        body=f"You've been matched for {activity}. Tap to see your group!",
        data={"type": "group_reveal", "group_id": group_id},
    )


async def notify_match(user1_push_token: Optional[str], user1_name: str,
                       user2_push_token: Optional[str], user2_name: str,
                       match_data: Optional[dict] = None) -> None:
    """Send match notifications to both users."""
    if user1_push_token:
        await send_push_notification(
            push_token=user1_push_token,
            title="It's a match! 💕",
            body=f"You and {user2_name} liked each other! Start chatting now.",
            data=match_data,
        )

    if user2_push_token:
        await send_push_notification(
            push_token=user2_push_token,
            title="It's a match! 💕",
            body=f"You and {user1_name} liked each other! Start chatting now.",
            data=match_data,
        )
