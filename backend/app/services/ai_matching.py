"""
AI-powered group matching within batches.
Uses OpenAI to form optimal groups from a batch of ~100 users.
Falls back to deterministic scoring if OpenAI is unavailable.
"""

import json
import logging
import uuid
from typing import Optional

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.date_request import DateRequest
from app.models.matching_batch import MatchingBatch, ProposedGroup, ProposedGroupMember
from app.models.report import BlockedPair
from app.models.user import User

logger = logging.getLogger(__name__)

client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global client
    if client is None:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return client


# ── User Profile Builder ──

def _attractiveness_tier_label(score: float) -> str:
    if score < 4.0:
        return "lower"
    elif score < 7.0:
        return "mid"
    return "higher"


def build_user_profile_for_ai(user: User, request: DateRequest) -> dict:
    """Build anonymized user profile for the AI matching prompt."""
    return {
        "id": str(user.id),
        "gender": user.gender,
        "age": user.age,
        "interests": (user.interests or [])[:15],
        "intent": user.relationship_intent or "open",
        "social_energy": user.social_energy,
        "humor": user.humor_styles or [],
        "communication": user.communication_pref,
        "lifestyle": {
            "drinking": user.drinking,
            "smoking": user.smoking,
            "exercise": user.exercise,
            "sleep": user.sleep_schedule,
        },
        "body_type": user.body_type,
        "height": user.height_cm,
        "attractiveness_tier": _attractiveness_tier_label(user.attractiveness_score or 5.0),
        "style": user.style_tags or [],
        "group_size_pref": request.group_size,
        "prefers": {
            "age": [user.age_range_min, user.age_range_max],
            "body_type": user.pref_body_type or [],
            "height": user.pref_height_range or [],
            "social_energy": user.pref_social_energy_range or [],
            "humor": user.pref_humor_styles or [],
        },
        "dealbreakers": user.dealbreakers or [],
        "pre_group_friends": [str(f.friend_user_id) for f in request.pre_group_friends],
    }


# ── Blocked Pairs Loader ──

async def _get_blocked_pairs(user_ids: list[uuid.UUID], db: AsyncSession) -> list[list[str]]:
    """Get all blocked pairs among the given users."""
    if len(user_ids) < 2:
        return []
    result = await db.execute(
        select(BlockedPair).where(
            BlockedPair.user_a_id.in_(user_ids) | BlockedPair.user_b_id.in_(user_ids)
        )
    )
    pairs = result.scalars().all()
    user_set = set(user_ids)
    return [
        [str(bp.user_a_id), str(bp.user_b_id)]
        for bp in pairs
        if bp.user_a_id in user_set and bp.user_b_id in user_set
    ]


# ── AI Matching ──

SYSTEM_PROMPT = """You are a matchmaking AI for a group dating app for university students. You receive profiles of users who want to go on a group date. Your job is to form groups of 4 or 6 people with EQUAL gender split (2M+2F for size 4, 3M+3F for size 6).

RULES (MUST follow):
1. Each group must have exactly equal males and females
2. Group size is 4 or 6 (use each user's group_size_pref)
3. NEVER group people in the blocked_pairs list
4. Users with pre_group_friends MUST be in the same group with those friends
5. Respect age preferences: each user's age must be within every other group member's preferred age range
6. Respect dealbreakers: if user has "smoking" dealbreaker, don't group with someone whose smoking is "regularly"
7. A user can only appear in ONE group

OPTIMIZE FOR:
- Personality compatibility (matching humor styles)
- Communication preference compatibility (texter+texter great, texter+caller bad)
- Social energy complementarity (slight differences create dynamic groups — diff of 1 is the sweet spot, identical is good, diff 3+ is bad)
- Group role diversity (planner + joker + connector > 3 planners — diverse roles make better group dynamics)
- Shared interests (more overlap = better)
- Relationship intent alignment (serious with serious, casual with casual)
- Attractiveness tier similarity within each group
- Mutual preference satisfaction (body type, height preferences)
- Lifestyle compatibility (drinking, exercise, sleep patterns)
- Location proximity (closer users = easier logistics, beyond max preferred distance is a hard filter)
- Diet compatibility (vegan+no_restrictions creates friction for venue choice, similar diets = easier planning)
- Activity-energy fit (high-energy users for karaoke/bar, calmer users for board games/dinner)

OUTPUT: Return ONLY valid JSON (no markdown):
{
  "groups": [
    {
      "members": ["user_id_1", "user_id_2", "user_id_3", "user_id_4"],
      "score": 8.5,
      "reasoning": "Brief explanation of why these people match well"
    }
  ],
  "unmatched": ["user_id_x"],
  "avg_quality": 8.2
}"""


async def ai_match_batch(
    batch: MatchingBatch,
    user_requests: list[tuple[User, DateRequest]],
    db: AsyncSession,
) -> dict:
    """
    Send batch to OpenAI for group formation. Returns parsed AI response.
    """
    user_profiles = [build_user_profile_for_ai(user, req) for user, req in user_requests]
    user_ids = [user.id for user, _ in user_requests]
    blocked = await _get_blocked_pairs(user_ids, db)

    payload = {
        "users": user_profiles,
        "blocked_pairs": blocked,
        "constraints": (
            "Equal gender split (2M+2F or 3M+3F). "
            "Respect pre_group_friends. Respect dealbreakers. Respect age ranges. "
            f"Activity: {batch.activity}. Date: {batch.time_slot_date}."
        ),
    }

    if not settings.OPENAI_API_KEY:
        logger.warning("No OpenAI API key — using fallback matching")
        return _fallback_match(user_requests)

    try:
        ai = _get_client()
        response = await ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)},
            ],
            max_tokens=4000,
            temperature=0.3,
        )

        content = response.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        result = json.loads(content)

        # Store AI metadata on batch
        batch.ai_model_used = "gpt-4o-mini"
        batch.ai_tokens_used = response.usage.total_tokens if response.usage else None
        batch.ai_score_payload = result

        return result

    except Exception as e:
        logger.error(f"AI matching failed: {e}")
        return _fallback_match(user_requests)


# ── Fallback Deterministic Matching ──

def _fallback_match(user_requests: list[tuple[User, DateRequest]]) -> dict:
    """Simple fallback: group by gender, pair sequentially."""
    males = [(u, r) for u, r in user_requests if u.gender == "male"]
    females = [(u, r) for u, r in user_requests if u.gender == "female"]

    groups = []
    half = 2  # Default to groups of 4
    i = 0
    while i + half <= len(males) and i + half <= len(females):
        members = (
            [str(u.id) for u, _ in males[i:i + half]]
            + [str(u.id) for u, _ in females[i:i + half]]
        )
        groups.append({
            "members": members,
            "score": 5.0,
            "reasoning": "Fallback matching — AI unavailable",
        })
        i += half

    unmatched = (
        [str(u.id) for u, _ in males[i:]]
        + [str(u.id) for u, _ in females[i:]]
    )

    return {"groups": groups, "unmatched": unmatched, "avg_quality": 5.0}


# ── Hard Constraint Validation ──

def validate_group(
    member_ids: list[str],
    user_map: dict[str, User],
    request_map: dict[str, DateRequest],
    blocked_set: set[tuple[str, str]],
) -> tuple[bool, str]:
    """Re-validate a proposed group against all hard constraints. Returns (valid, reason)."""
    users = [user_map.get(mid) for mid in member_ids]
    users = [u for u in users if u is not None]

    if len(users) != len(member_ids):
        return False, "Missing users"

    # Gender balance
    males = [u for u in users if u.gender == "male"]
    females = [u for u in users if u.gender == "female"]
    if len(males) != len(females):
        return False, f"Gender imbalance: {len(males)}M/{len(females)}F"

    size = len(users)
    if size not in (4, 6):
        return False, f"Invalid group size: {size}"

    # Blocked pairs
    for i, a in enumerate(member_ids):
        for b in member_ids[i + 1:]:
            if (a, b) in blocked_set or (b, a) in blocked_set:
                return False, f"Blocked pair: {a}, {b}"

    # Age compatibility
    for u in users:
        for v in users:
            if u.id == v.id:
                continue
            if v.age < u.age_range_min or v.age > u.age_range_max:
                return False, f"Age incompatible: {u.first_name} wants {u.age_range_min}-{u.age_range_max}, {v.first_name} is {v.age}"

    # Dealbreakers
    for u in users:
        for v in users:
            if u.id == v.id:
                continue
            dbs = set(u.dealbreakers or [])
            if "smoking" in dbs and v.smoking == "regularly":
                return False, f"Dealbreaker: {u.first_name} has smoking dealbreaker"
            if "heavy_drinking" in dbs and v.drinking == "regularly":
                return False, f"Dealbreaker: {u.first_name} has heavy drinking dealbreaker"
            if "too_quiet" in dbs and (v.social_energy or 3) <= 1:
                return False, f"Dealbreaker: too_quiet"
            if "too_loud" in dbs and (v.social_energy or 3) >= 5:
                return False, f"Dealbreaker: too_loud"

    return True, "OK"


# ── Proposed Group Creation ──

async def create_proposed_groups(
    batch: MatchingBatch,
    ai_result: dict,
    user_map: dict[str, User],
    request_map: dict[str, DateRequest],
    blocked_set: set[tuple[str, str]],
    db: AsyncSession,
) -> list[ProposedGroup]:
    """Parse AI response, validate, and create ProposedGroup records."""
    proposed = []
    ai_groups = ai_result.get("groups", [])

    # Determine best scheduled hour from batch
    hours = batch.time_slot_hours or [19]
    # Pick the most common preferred hour (middle of range)
    mid_hour = hours[len(hours) // 2] if hours else 19
    scheduled_time = f"{mid_hour}:00"

    for g in ai_groups:
        member_ids = g.get("members", [])
        score = g.get("score", 0.0)
        reasoning = g.get("reasoning", "")

        # Validate hard constraints
        valid, reason = validate_group(member_ids, user_map, request_map, blocked_set)
        if not valid:
            logger.warning(f"AI proposed invalid group: {reason}")
            continue

        pg = ProposedGroup(
            batch_id=batch.id,
            activity=batch.activity,
            scheduled_date=batch.time_slot_date,
            scheduled_time=scheduled_time,
            status="proposed",
            ai_compatibility_score=score,
            ai_reasoning=reasoning,
        )
        db.add(pg)
        await db.flush()

        for mid in member_ids:
            user = user_map.get(mid)
            req = request_map.get(mid)
            if user and req:
                db.add(ProposedGroupMember(
                    proposed_group_id=pg.id,
                    user_id=user.id,
                    date_request_id=req.id,
                ))

        proposed.append(pg)

    return proposed


# ── Main Entry Point ──

async def run_matching_for_batch(
    batch: MatchingBatch,
    db: AsyncSession,
    force: bool = False,
) -> list[ProposedGroup]:
    """
    Run AI matching for a single batch.

    Args:
        batch: The MatchingBatch to process
        db: Database session
        force: If True, match regardless of quality (6h deadline)

    Returns:
        List of created ProposedGroup records
    """
    batch.status = "scoring"
    await db.flush()

    # Load all pending requests for this activity + date
    result = await db.execute(
        select(DateRequest)
        .where(
            DateRequest.status == "pending",
            DateRequest.activity == batch.activity,
        )
        .options(
            selectinload(DateRequest.availability_slots),
            selectinload(DateRequest.pre_group_friends),
            selectinload(DateRequest.user),
        )
    )
    requests = result.scalars().all()

    # Filter to requests matching this batch's date
    matching_requests = []
    for req in requests:
        for slot in req.availability_slots:
            if slot.date == batch.time_slot_date:
                slot_hours = set(slot.time_hours or [])
                batch_hours = set(batch.time_slot_hours or [])
                if slot_hours & batch_hours:  # Any overlapping hour
                    matching_requests.append(req)
                    break

    if not matching_requests:
        batch.status = "pending"
        await db.flush()
        return []

    # Deduplicate
    seen: set[uuid.UUID] = set()
    unique: list[DateRequest] = []
    for req in matching_requests:
        if req.user_id not in seen:
            seen.add(req.user_id)
            unique.append(req)

    user_requests = [(req.user, req) for req in unique]
    user_map = {str(u.id): u for u, _ in user_requests}
    request_map = {str(u.id): r for u, r in user_requests}

    # Get blocked pairs
    user_ids = [u.id for u, _ in user_requests]
    blocked_result = await _get_blocked_pairs(user_ids, db)
    blocked_set = set()
    for pair in blocked_result:
        blocked_set.add((pair[0], pair[1]))
        blocked_set.add((pair[1], pair[0]))

    # Run AI matching
    ai_result = await ai_match_batch(batch, user_requests, db)
    batch.status = "scored"

    avg_quality = ai_result.get("avg_quality", 0)

    # Quality gate (skip for forced matches)
    if not force and avg_quality < 7.0:
        logger.info(f"Batch {batch.id} quality too low ({avg_quality}), waiting for more users")
        batch.status = "pending"
        await db.flush()
        return []

    # Create proposed groups
    proposed = await create_proposed_groups(
        batch, ai_result, user_map, request_map, blocked_set, db,
    )

    if proposed:
        batch.status = "admin_review"
    else:
        batch.status = "pending"

    await db.commit()

    logger.info(f"Batch {batch.id}: {len(proposed)} groups proposed, avg quality {avg_quality}")
    return proposed
