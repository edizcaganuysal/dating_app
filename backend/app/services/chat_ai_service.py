"""
AI Chat Assistant ("Genie") for group date planning.
Uses OpenAI to generate welcome messages, conversation starters,
venue recommendations, and planning help.
"""

import logging
import time
import uuid as uuid_mod
from typing import Optional

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chat import ChatMessage, ChatRoom
from app.models.group import DateGroup

logger = logging.getLogger(__name__)

GENIE_USER_ID = uuid_mod.UUID("00000000-0000-0000-0000-000000000001")

# Rate limiting: track last Genie response time per room
_room_cooldowns: dict[str, float] = {}
COOLDOWN_SECONDS = 30

client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global client
    if client is None:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return client


# ── Activity Knowledge Base ──

ACTIVITY_CONTEXT = {
    "dinner": {
        "label": "Dinner",
        "tips": "Make a reservation ahead of time. Check for dietary restrictions in the group. Dress smart casual.",
        "expect": "Sit-down meal at a restaurant, usually 1.5-2 hours. Great for conversation.",
        "budget": "$15-40 per person",
        "starters": [
            "What's the best meal you've ever had?",
            "If you could only eat one cuisine for a year, what would it be?",
            "What's your go-to comfort food?",
            "Anyone here a secret chef?",
        ],
    },
    "bar": {
        "label": "Bar / Pub",
        "tips": "Check for happy hour specials. Arrive a bit early for good seats. Don't forget to hydrate!",
        "expect": "Casual drinks and conversation, usually 1.5-2 hours. Pool tables or darts if available.",
        "budget": "$10-30 per person",
        "starters": [
            "What's your go-to drink order?",
            "Best bar you've ever been to?",
            "What song always gets you on the dance floor?",
            "Hot take: what's an overrated drink?",
        ],
    },
    "bowling": {
        "label": "Bowling",
        "tips": "Wear socks! Most places provide shoes. Book a lane in advance on weekends.",
        "expect": "2-3 games takes about 1.5 hours. Bumpers are not cheating, they're strategic.",
        "budget": "$10-20 per person",
        "starters": [
            "Are you a bumpers-on or bumpers-off person?",
            "What's the worst bowling score you've ever gotten?",
            "Should we do teams or free-for-all?",
            "Anyone here secretly a bowling pro?",
        ],
    },
    "karaoke": {
        "label": "Karaoke",
        "tips": "Book a private room for the group. Everyone sounds better after the first song. Bring your confidence!",
        "expect": "1-2 hours in a private room. Song books or touchscreen to pick songs.",
        "budget": "$10-25 per person (room + drinks)",
        "starters": [
            "What's your go-to karaoke song?",
            "Are you more of a shower singer or car singer?",
            "What artist do you think you could impersonate?",
            "Should we start with a group song to break the ice?",
        ],
    },
    "board_games": {
        "label": "Board Game Cafe",
        "tips": "Staff can recommend games for your group size. Grab food and drinks to fuel the fun.",
        "expect": "2-3 hours at a cafe with hundreds of games. Staff explains the rules.",
        "budget": "$5-15 per person (cover + food)",
        "starters": [
            "Are you a sore loser or a graceful one?",
            "What's the most competitive you've ever gotten over a game?",
            "Strategy games or luck-based games?",
            "Anyone played Settlers of Catan? Alliances welcome.",
        ],
    },
    "cooking_class": {
        "label": "Cooking Class",
        "tips": "Mention any allergies when booking. Wear comfortable clothes. You'll eat what you make!",
        "expect": "2-2.5 hour hands-on class, usually with a specific cuisine. You eat your creation at the end.",
        "budget": "$30-60 per person",
        "starters": [
            "What's your signature dish at home?",
            "Biggest kitchen disaster story?",
            "If you had a food truck, what would you serve?",
            "Are you a recipe-follower or a wing-it cook?",
        ],
    },
    "trivia_night": {
        "label": "Trivia Night",
        "tips": "Check the bar's schedule for trivia night times. Come up with a fun team name!",
        "expect": "1.5-2 hours at a bar hosting trivia. Usually 4-6 rounds of questions.",
        "budget": "$10-25 per person (drinks + food)",
        "starters": [
            "What's your random area of expertise?",
            "What would your Jeopardy category be?",
            "Pop culture, history, or science — which is your strength?",
            "We need a team name! Any ideas?",
        ],
    },
    "mini_golf": {
        "label": "Mini Golf",
        "tips": "Indoor or outdoor — check the weather! Some spots have glow-in-the-dark at night.",
        "expect": "18 holes takes about 1-1.5 hours. Easy to talk while playing.",
        "budget": "$10-18 per person",
        "starters": [
            "Friendly game or are we keeping score?",
            "Anyone played real golf? Is mini golf harder or easier?",
            "What's the most creative mini golf course you've seen?",
            "Loser buys ice cream after?",
        ],
    },
    "escape_room": {
        "label": "Escape Room",
        "tips": "Book in advance! Arrive 15 min early. Wear comfortable clothes. Communicate everything you find.",
        "expect": "60-minute puzzle room. You work as a team to solve clues and escape.",
        "budget": "$25-35 per person",
        "starters": [
            "Would you survive a horror movie?",
            "Are you the clue-finder, the puzzle-solver, or the cheerleader?",
            "What difficulty should we pick?",
            "If we get stuck, who's most likely to find the hidden clue?",
        ],
    },
    "arcade": {
        "label": "Arcade",
        "tips": "Most arcades use cards now, not quarters. Check for unlimited play deals!",
        "expect": "1.5-2 hours of games, from classics to racing to claw machines.",
        "budget": "$15-30 per person",
        "starters": [
            "What's the arcade game you could beat anyone at?",
            "Claw machine — skill or scam?",
            "Mario Kart: who's picking Rainbow Road?",
            "Should we team up or compete for the most tickets?",
        ],
    },
}

# Fallback templates when OpenAI is unavailable
WELCOME_FALLBACK = (
    "Hey everyone! I'm Genie, your date planning assistant. "
    "You're all set for {activity} — exciting! "
    "Here are some conversation starters to get things going:\n\n"
    "{starters}\n\n"
    "Need help planning? Tap the Genie button or type @genie anytime!"
)


async def generate_welcome_message(
    activity: str,
    member_names: list[str],
    scheduled_date: str = "",
    scheduled_time: str = "",
) -> str:
    """Generate a personalized welcome message for a new group chat."""
    ctx = ACTIVITY_CONTEXT.get(activity, {})
    names_str = ", ".join(member_names)

    if not settings.OPENAI_API_KEY:
        starters = "\n".join(f"- {s}" for s in (ctx.get("starters", [])[:3]))
        return WELCOME_FALLBACK.format(
            activity=ctx.get("label", activity),
            starters=starters,
        )

    try:
        ai = _get_client()
        response = await ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Genie, a friendly and fun AI assistant in a group dating app called LoveGenie. "
                        "You help university students plan their group dates and break the ice. "
                        "Keep messages under 400 characters. Be warm, casual, and encouraging. Use 1-2 emojis max. "
                        "Never be creepy or overly romantic. You're the group's helpful buddy."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Write a welcome message for a group chat. The group members are: {names_str}. "
                        f"They're going on a {ctx.get('label', activity)} date"
                        f"{f' on {scheduled_date}' if scheduled_date else ''}"
                        f"{f' at {scheduled_time}' if scheduled_time else ''}. "
                        f"Include 2-3 fun conversation starters specific to {ctx.get('label', activity)}. "
                        f"End with a hint that they can ask you for help anytime by tapping the Genie button."
                    ),
                },
            ],
            max_tokens=300,
        )
        return response.choices[0].message.content or WELCOME_FALLBACK.format(
            activity=ctx.get("label", activity),
            starters="\n".join(f"- {s}" for s in ctx.get("starters", [])[:3]),
        )
    except Exception as e:
        logger.error(f"Welcome message generation failed: {e}")
        starters = "\n".join(f"- {s}" for s in ctx.get("starters", [])[:3])
        return WELCOME_FALLBACK.format(activity=ctx.get("label", activity), starters=starters)


async def generate_assistant_response(
    activity: str,
    member_names: list[str],
    recent_messages: list[dict],
    user_query: str,
) -> str:
    """Generate an AI response to a user's @genie query."""
    ctx = ACTIVITY_CONTEXT.get(activity, {})

    if not settings.OPENAI_API_KEY:
        return f"Here are some tips for your {ctx.get('label', activity)}: {ctx.get('tips', 'Have fun!')}"

    try:
        ai = _get_client()

        # Build conversation context
        chat_context = ""
        if recent_messages:
            chat_context = "Recent chat messages:\n" + "\n".join(
                f"- {m.get('sender_name', '?')}: {m.get('content', '')}"
                for m in recent_messages[-8:]
            )

        response = await ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Genie, a helpful AI assistant in a group dating app for university students. "
                        "You help groups plan their dates. Be concise (under 300 chars), fun, and specific. "
                        "Use 1-2 emojis max. When suggesting venues, give 2-3 specific-sounding options with prices. "
                        "When giving tips, be practical. Never reveal private user data.\n\n"
                        f"Activity: {ctx.get('label', activity)}\n"
                        f"Planning tips: {ctx.get('tips', '')}\n"
                        f"What to expect: {ctx.get('expect', '')}\n"
                        f"Budget: {ctx.get('budget', '')}\n"
                        f"Group members: {', '.join(member_names)}\n"
                    ),
                },
                *(
                    [{"role": "user", "content": chat_context}] if chat_context else []
                ),
                {
                    "role": "user",
                    "content": f"A group member asks: {user_query}",
                },
            ],
            max_tokens=200,
        )
        return response.choices[0].message.content or f"Try this: {ctx.get('tips', 'Have a great time!')}"
    except Exception as e:
        logger.error(f"Assistant response failed: {e}")
        return f"I'm having trouble thinking right now! In the meantime: {ctx.get('tips', 'Have fun!')}"


def check_rate_limit(room_id: str) -> bool:
    """Return True if Genie can respond (not rate-limited)."""
    now = time.time()
    last = _room_cooldowns.get(room_id, 0)
    if now - last < COOLDOWN_SECONDS:
        return False
    _room_cooldowns[room_id] = now
    return True


async def send_welcome_message(
    room_id: uuid_mod.UUID,
    activity: str,
    member_names: list[str],
    scheduled_date: str,
    scheduled_time: str,
    db: AsyncSession,
) -> None:
    """Generate and save a welcome message to a new group chat room."""
    content = await generate_welcome_message(activity, member_names, scheduled_date, scheduled_time)

    msg = ChatMessage(
        room_id=room_id,
        sender_id=GENIE_USER_ID,
        content=content,
        message_type="ai",
    )
    db.add(msg)
    # Don't commit here — caller manages the transaction
