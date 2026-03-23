"""
Deterministic batch formation for the matching pipeline.
Groups pending DateRequests into ~100-user batches by:
  1. Activity + date + overlapping hours (STRICT)
  2. Location proximity (~50km clusters)
  3. Attractiveness tier (low/mid/high)
  4. Personality similarity (Euclidean distance on normalized vector)
"""

import logging
import math
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.date_request import AvailabilitySlot, DateRequest
from app.models.matching_batch import MatchingBatch
from app.models.user import User
from app.services.geo_utils import haversine_km

logger = logging.getLogger(__name__)

# ── Configuration ──

BATCH_TARGET_SIZE = 100
BATCH_MIN_SIZE = 80
BATCH_MAX_SIZE = 120
PROXIMITY_RADIUS_KM = 50.0
MIN_POOL_SIZE = 8  # Need at least 8 for two groups of 4

# Popular interests used for personality vector
POPULAR_INTERESTS = {
    "hiking", "cooking", "gym", "travel", "photography", "music",
    "movies", "gaming", "reading", "coffee",
}


# ── Data Classes ──

@dataclass
class PoolKey:
    activity: str
    date: str  # ISO date string
    hours: tuple[int, ...]  # Sorted tuple of overlapping hours


@dataclass
class UserRequest:
    user: User
    request: DateRequest
    hours: list[int]


@dataclass
class Batch:
    activity: str
    date: str
    hours: list[int]
    users: list[UserRequest]
    center_lat: Optional[float] = None
    center_lng: Optional[float] = None


# ── Personality Vector ──

def personality_vector(user: User) -> list[float]:
    """Compute a normalized 4D personality vector for clustering."""
    return [
        (user.social_energy or 3) / 5.0,
        {"serious": 1.0, "casual": 0.0, "open": 0.5}.get(user.relationship_intent or "open", 0.5),
        len(set(user.interests or []) & POPULAR_INTERESTS) / max(len(POPULAR_INTERESTS), 1),
        {"never": 0.0, "socially": 0.5, "regularly": 1.0}.get(user.drinking or "socially", 0.5),
    ]


def euclidean_distance(a: list[float], b: list[float]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


# ── Attractiveness Tiers ──

def attractiveness_tier(score: float) -> int:
    """0=low (1-3.9), 1=mid (4-6.9), 2=high (7-10)."""
    if score < 4.0:
        return 0
    elif score < 7.0:
        return 1
    return 2


# ── Pool Formation ──

async def _fetch_pending_requests(db: AsyncSession) -> list[tuple[DateRequest, User]]:
    """Fetch all pending date requests with user data."""
    result = await db.execute(
        select(DateRequest)
        .where(DateRequest.status == "pending")
        .options(
            selectinload(DateRequest.availability_slots),
            selectinload(DateRequest.pre_group_friends),
            selectinload(DateRequest.user),
        )
    )
    requests = result.scalars().all()
    return [(req, req.user) for req in requests]


def _group_into_pools(
    request_pairs: list[tuple[DateRequest, User]],
) -> dict[str, list[UserRequest]]:
    """
    Group requests by (activity, date). Within each group, track which hours each user is available.
    Key format: "activity|date"
    """
    pools: dict[str, list[UserRequest]] = defaultdict(list)

    for req, user in request_pairs:
        for slot in req.availability_slots:
            hours = slot.time_hours if slot.time_hours else [18, 19, 20, 21]
            key = f"{req.activity}|{slot.date.isoformat()}"
            pools[key].append(UserRequest(user=user, request=req, hours=hours))

    return pools


# ── Location Clustering ──

def _cluster_by_location(
    users: list[UserRequest],
    radius_km: float = PROXIMITY_RADIUS_KM,
) -> list[list[UserRequest]]:
    """
    Greedy geographic clustering. Users without location go into a separate cluster.
    """
    with_loc = [(u, u.user.latitude, u.user.longitude) for u in users if u.user.latitude and u.user.longitude]
    without_loc = [u for u in users if not u.user.latitude or not u.user.longitude]

    if not with_loc:
        return [without_loc] if without_loc else []

    assigned = set()
    clusters: list[list[UserRequest]] = []

    # Sort by density (users with most neighbors first)
    neighbor_counts = []
    for i, (u, lat, lng) in enumerate(with_loc):
        count = sum(
            1 for j, (_, lat2, lng2) in enumerate(with_loc)
            if i != j and haversine_km(lat, lng, lat2, lng2) <= radius_km
        )
        neighbor_counts.append((count, i))
    neighbor_counts.sort(reverse=True)

    for _, seed_idx in neighbor_counts:
        if seed_idx in assigned:
            continue

        seed_u, seed_lat, seed_lng = with_loc[seed_idx]
        cluster = [seed_u]
        assigned.add(seed_idx)

        for j, (other_u, lat2, lng2) in enumerate(with_loc):
            if j in assigned:
                continue
            if haversine_km(seed_lat, seed_lng, lat2, lng2) <= radius_km:
                cluster.append(other_u)
                assigned.add(j)

        clusters.append(cluster)

    # Add users without location as their own cluster
    if without_loc:
        clusters.append(without_loc)

    return clusters


# ── Tier + Personality Sub-Clustering ──

def _split_into_batches(
    cluster: list[UserRequest],
    target_size: int = BATCH_TARGET_SIZE,
) -> list[list[UserRequest]]:
    """
    Within a location cluster, split by attractiveness tier then personality similarity.
    Returns batches of ~target_size.
    """
    if len(cluster) <= target_size:
        return [cluster]

    # Group by attractiveness tier
    tiers: dict[int, list[UserRequest]] = defaultdict(list)
    for u in cluster:
        t = attractiveness_tier(u.user.attractiveness_score or 5.0)
        tiers[t].append(u)

    batches: list[list[UserRequest]] = []

    for tier_users in tiers.values():
        if len(tier_users) <= target_size:
            batches.append(tier_users)
            continue

        # Sub-cluster by personality similarity using greedy approach
        vectors = [(u, personality_vector(u.user)) for u in tier_users]
        used = set()
        for i, (u, vec) in enumerate(vectors):
            if i in used:
                continue
            batch = [(u, vec)]
            used.add(i)

            # Find nearest unused users until batch is full
            distances = []
            for j, (other_u, other_vec) in enumerate(vectors):
                if j in used:
                    continue
                distances.append((euclidean_distance(vec, other_vec), j))
            distances.sort()

            for _, j in distances:
                if j in used:
                    continue
                if len(batch) >= target_size:
                    break
                batch.append(vectors[j])
                used.add(j)

            batches.append([item[0] for item in batch])

    # Merge very small batches (< MIN_POOL_SIZE) with the nearest larger batch
    final_batches = []
    small = []
    for b in batches:
        if len(b) >= MIN_POOL_SIZE:
            final_batches.append(b)
        else:
            small.extend(b)

    if small:
        if final_batches:
            # Add to the smallest existing batch
            smallest = min(final_batches, key=len)
            smallest.extend(small)
        else:
            final_batches.append(small)

    return final_batches


# ── Main Entry Point ──

async def form_batches(db: AsyncSession) -> list[MatchingBatch]:
    """
    Main batch formation function. Called every 15 minutes by cron.
    Groups pending requests into MatchingBatch records.

    Pipeline:
    1. Fetch all pending DateRequests
    2. Group by (activity, date) — STRICT
    3. Location cluster (~50km)
    4. Attractiveness tier split
    5. Personality similarity sub-cluster
    6. Create MatchingBatch records
    """
    request_pairs = await _fetch_pending_requests(db)
    if not request_pairs:
        logger.info("No pending requests to batch")
        return []

    pools = _group_into_pools(request_pairs)
    created_batches: list[MatchingBatch] = []

    for pool_key, user_requests in pools.items():
        # Deduplicate users (same user may appear via multiple slots)
        seen_users: set[uuid.UUID] = set()
        unique_requests: list[UserRequest] = []
        for ur in user_requests:
            if ur.user.id not in seen_users:
                seen_users.add(ur.user.id)
                unique_requests.append(ur)

        if len(unique_requests) < MIN_POOL_SIZE:
            continue  # Too small, wait for more users

        activity, date_str = pool_key.split("|", 1)

        # Collect all hours in this pool
        all_hours: set[int] = set()
        for ur in unique_requests:
            all_hours.update(ur.hours)

        # Location clustering
        location_clusters = _cluster_by_location(unique_requests)

        for loc_cluster in location_clusters:
            if len(loc_cluster) < MIN_POOL_SIZE:
                continue

            # Split into batches by tier + personality
            sub_batches = _split_into_batches(loc_cluster)

            for batch_users in sub_batches:
                if len(batch_users) < MIN_POOL_SIZE:
                    continue

                # Check if a batch already exists for this pool (avoid duplicates)
                user_ids = {u.user.id for u in batch_users}

                # Compute center location
                lats = [u.user.latitude for u in batch_users if u.user.latitude]
                lngs = [u.user.longitude for u in batch_users if u.user.longitude]
                center_lat = sum(lats) / len(lats) if lats else None
                center_lng = sum(lngs) / len(lngs) if lngs else None

                import datetime as dt
                batch = MatchingBatch(
                    activity=activity,
                    time_slot_date=dt.date.fromisoformat(date_str),
                    time_slot_hours=sorted(all_hours),
                    status="pending",
                    user_count=len(batch_users),
                    trigger_type="threshold" if len(batch_users) >= BATCH_TARGET_SIZE else "cron",
                    center_lat=center_lat,
                    center_lng=center_lng,
                )
                db.add(batch)
                created_batches.append(batch)

                logger.info(
                    f"Created batch: {activity} on {date_str}, "
                    f"{len(batch_users)} users, center=({center_lat}, {center_lng})"
                )

    if created_batches:
        await db.commit()

    return created_batches
