import uuid
from collections import defaultdict
from itertools import combinations
from statistics import stdev
from typing import Optional

from sqlalchemy import or_, and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ChatParticipant, ChatRoom
from app.models.date_request import AvailabilitySlot, DateRequest, PreGroupFriend
from app.models.group import DateGroup, GroupMember
from app.models.report import BlockedPair
from app.models.user import User, VibeAnswer


def check_age_compatibility(users: list[User]) -> bool:
    """Every user must fall within every other user's [age_range_min, age_range_max]."""
    for u in users:
        for other in users:
            if u.id == other.id:
                continue
            if other.age < u.age_range_min or other.age > u.age_range_max:
                return False
    return True


async def check_no_blocked_pairs(user_ids: list[uuid.UUID], db: AsyncSession) -> bool:
    """Return True if no blocked pair exists between any two users in the list."""
    if len(user_ids) < 2:
        return True
    pairs = list(combinations(user_ids, 2))
    conditions = []
    for a, b in pairs:
        conditions.append(and_(BlockedPair.blocker_id == a, BlockedPair.blocked_id == b))
        conditions.append(and_(BlockedPair.blocker_id == b, BlockedPair.blocked_id == a))
    result = await db.execute(select(BlockedPair.id).where(or_(*conditions)).limit(1))
    return result.first() is None


def compute_group_score(males: list[User], females: list[User]) -> float:
    """Score a candidate group based on interest overlap, vibe alignment, and attractiveness variance."""
    interest_score = 0.0
    vibe_score = 0.0

    for m in males:
        m_interests = set(m.interests or [])
        m_vibes = {va.question: va.answer for va in (m.vibe_answers or [])}
        for f in females:
            f_interests = set(f.interests or [])
            interest_score += len(m_interests & f_interests)

            f_vibes = {va.question: va.answer for va in (f.vibe_answers or [])}
            for q in m_vibes:
                if q in f_vibes and m_vibes[q] == f_vibes[q]:
                    vibe_score += 1

    all_users = males + females
    scores = [u.attractiveness_score for u in all_users]
    attractiveness_variance = stdev(scores) if len(scores) > 1 else 0.0

    return interest_score + vibe_score - (attractiveness_variance * 10)


def get_overlapping_slots(
    requests: list[DateRequest],
) -> dict[tuple, list[DateRequest]]:
    """Group requests by (date, time_window) where they share availability.

    Returns a dict mapping (date, time_window) -> list of DateRequests available at that slot.
    """
    slot_map: dict[tuple, list[DateRequest]] = defaultdict(list)
    for req in requests:
        for slot in req.availability_slots:
            key = (slot.date, slot.time_window)
            slot_map[key].append(req)
    return slot_map


def _build_pregroup_map(
    requests: list[DateRequest],
) -> dict[uuid.UUID, set[uuid.UUID]]:
    """Build a mapping from user_id -> set of friend user_ids they must be grouped with."""
    pregroup: dict[uuid.UUID, set[uuid.UUID]] = defaultdict(set)
    for req in requests:
        for pg in req.pre_group_friends:
            pregroup[req.user_id].add(pg.friend_user_id)
            # Symmetry: if A wants B, B should be with A
            pregroup[pg.friend_user_id].add(req.user_id)
    return pregroup


def _get_pregroup_cluster(
    user_id: uuid.UUID,
    pregroup_map: dict[uuid.UUID, set[uuid.UUID]],
) -> set[uuid.UUID]:
    """Get the full cluster of pre-grouped users for a given user (transitive closure)."""
    cluster = {user_id}
    queue = [user_id]
    while queue:
        uid = queue.pop()
        for friend_id in pregroup_map.get(uid, set()):
            if friend_id not in cluster:
                cluster.add(friend_id)
                queue.append(friend_id)
    return cluster


def _generate_candidate_groups(
    male_requests: list[DateRequest],
    female_requests: list[DateRequest],
    group_size: int,
    pregroup_map: dict[uuid.UUID, set[uuid.UUID]],
    user_map: dict[uuid.UUID, User],
) -> list[tuple[list[DateRequest], list[DateRequest]]]:
    """Generate all valid candidate group compositions (male_reqs, female_reqs).

    Returns list of (male_requests, female_requests) tuples for valid candidate groups.
    """
    half = group_size // 2
    candidates = []

    # Build clusters for pre-grouped users
    male_clusters: list[list[DateRequest]] = []
    used_males: set[uuid.UUID] = set()
    for req in male_requests:
        if req.user_id in used_males:
            continue
        cluster_ids = _get_pregroup_cluster(req.user_id, pregroup_map)
        cluster_reqs = [r for r in male_requests if r.user_id in cluster_ids]
        used_males.update(r.user_id for r in cluster_reqs)
        male_clusters.append(cluster_reqs)

    female_clusters: list[list[DateRequest]] = []
    used_females: set[uuid.UUID] = set()
    for req in female_requests:
        if req.user_id in used_females:
            continue
        cluster_ids = _get_pregroup_cluster(req.user_id, pregroup_map)
        cluster_reqs = [r for r in female_requests if r.user_id in cluster_ids]
        used_females.update(r.user_id for r in cluster_reqs)
        female_clusters.append(cluster_reqs)

    # Generate combinations of clusters that sum to exactly `half` per gender
    male_combos = _cluster_combinations(male_clusters, half)
    female_combos = _cluster_combinations(female_clusters, half)

    for m_combo in male_combos:
        for f_combo in female_combos:
            candidates.append((m_combo, f_combo))

    return candidates


def _cluster_combinations(
    clusters: list[list[DateRequest]], target: int
) -> list[list[DateRequest]]:
    """Find all combinations of clusters that sum to exactly target count."""
    results: list[list[DateRequest]] = []

    def backtrack(idx: int, current: list[DateRequest]):
        if len(current) == target:
            results.append(list(current))
            return
        if len(current) > target or idx >= len(clusters):
            return
        # Skip this cluster
        backtrack(idx + 1, current)
        # Include this cluster
        if len(current) + len(clusters[idx]) <= target:
            backtrack(idx + 1, current + clusters[idx])

    backtrack(0, [])
    return results


async def run_batch_matching(db: AsyncSession) -> list[DateGroup]:
    """Run the batch matching algorithm to form date groups from pending requests."""
    # 1. Fetch all pending requests with relationships
    result = await db.execute(
        select(DateRequest)
        .where(DateRequest.status == "pending")
        .options(
            selectinload(DateRequest.availability_slots),
            selectinload(DateRequest.pre_group_friends),
            selectinload(DateRequest.user).selectinload(User.vibe_answers),
        )
    )
    all_requests = list(result.scalars().all())

    if not all_requests:
        return []

    # Build user map for quick lookup
    user_map: dict[uuid.UUID, User] = {}
    request_map: dict[uuid.UUID, DateRequest] = {}
    for req in all_requests:
        user_map[req.user_id] = req.user
        request_map[req.user_id] = req

    # 2. Group by activity
    activity_groups: dict[str, list[DateRequest]] = defaultdict(list)
    for req in all_requests:
        activity_groups[req.activity].append(req)

    formed_groups: list[DateGroup] = []
    assigned_user_ids: set[uuid.UUID] = set()

    # 3. For each activity group
    for activity, requests in activity_groups.items():
        # Group by overlapping availability slots
        slot_groups = get_overlapping_slots(requests)

        # Collect all scored candidates across all time slots
        scored_candidates: list[tuple[float, list[DateRequest], list[DateRequest], tuple]] = []

        for (slot_date, slot_time), slot_requests in slot_groups.items():
            # Separate by gender
            male_reqs = [r for r in slot_requests if user_map[r.user_id].gender == "male"]
            female_reqs = [r for r in slot_requests if user_map[r.user_id].gender == "female"]

            # Group by requested group_size
            for group_size in (4, 6):
                half = group_size // 2
                size_male = [r for r in male_reqs if r.group_size == group_size]
                size_female = [r for r in female_reqs if r.group_size == group_size]

                if len(size_male) < half or len(size_female) < half:
                    continue

                pregroup_map = _build_pregroup_map(size_male + size_female)

                candidates = _generate_candidate_groups(
                    size_male, size_female, group_size, pregroup_map, user_map
                )

                for m_reqs, f_reqs in candidates:
                    m_users = [user_map[r.user_id] for r in m_reqs]
                    f_users = [user_map[r.user_id] for r in f_reqs]
                    all_users = m_users + f_users

                    # Check age compatibility
                    if not check_age_compatibility(all_users):
                        continue

                    # Check pre-group constraints: all pre-grouped friends must be present
                    all_user_ids = {u.id for u in all_users}
                    pregroup_ok = True
                    for u in all_users:
                        required_friends = pregroup_map.get(u.id, set())
                        if not required_friends.issubset(all_user_ids):
                            pregroup_ok = False
                            break
                    if not pregroup_ok:
                        continue

                    score = compute_group_score(m_users, f_users)
                    scored_candidates.append(
                        (score, m_reqs, f_reqs, (slot_date, slot_time))
                    )

        # 5. Greedy assignment: sort by score descending
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        for score, m_reqs, f_reqs, (slot_date, slot_time) in scored_candidates:
            all_reqs = m_reqs + f_reqs
            all_uids = [r.user_id for r in all_reqs]

            # Skip if any user already assigned
            if any(uid in assigned_user_ids for uid in all_uids):
                continue

            # Check blocked pairs (async)
            if not await check_no_blocked_pairs(all_uids, db):
                continue

            # 6. Create the group
            date_group = DateGroup(
                activity=activity,
                scheduled_date=slot_date,
                scheduled_time=slot_time,
                status="upcoming",
            )
            db.add(date_group)
            await db.flush()

            # Create GroupMember records
            for req in all_reqs:
                member = GroupMember(
                    group_id=date_group.id,
                    user_id=req.user_id,
                    date_request_id=req.id,
                )
                db.add(member)

            # Update request statuses
            for req in all_reqs:
                req.status = "matched"

            # Create group chat room
            chat_room = ChatRoom(
                room_type="group",
                group_id=date_group.id,
            )
            db.add(chat_room)
            await db.flush()

            for req in all_reqs:
                participant = ChatParticipant(
                    room_id=chat_room.id,
                    user_id=req.user_id,
                )
                db.add(participant)

            assigned_user_ids.update(all_uids)
            formed_groups.append(date_group)

    await db.commit()

    # Refresh groups with members loaded
    refreshed: list[DateGroup] = []
    for grp in formed_groups:
        result = await db.execute(
            select(DateGroup)
            .where(DateGroup.id == grp.id)
            .options(selectinload(DateGroup.members).selectinload(GroupMember.user))
        )
        refreshed.append(result.scalar_one())

    return refreshed
