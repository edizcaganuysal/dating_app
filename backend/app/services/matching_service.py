import random
import uuid
from collections import defaultdict
from itertools import combinations
from statistics import mean, stdev, variance
from typing import Optional

from sqlalchemy import or_, and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.algorithm_config import AlgorithmConfig
from app.models.chat import ChatParticipant, ChatRoom
from app.models.date_request import DateRequest, PreGroupFriend
from app.models.group import DateGroup, GroupMember
from app.models.report import BlockedPair
from app.models.user import User, VibeAnswer
from app.services.geo_utils import haversine_km


# ── Default Configuration ──

DEFAULT_WEIGHTS = {
    "att_cohesion": 5.0,
    "role_diversity": 3.0,
    "energy_balance": 1.5,
    "personality_div": 2.5,
    "intent_alignment": 2.0,
    "activity_fit": 1.5,
    "values_baseline": 1.5,
    "friction": 1.5,
    "epsilon": 0.15,
    "num_restarts": 20,
}

IDEAL_ENERGY_MAP = {
    "escape_room": 3.5, "cooking_class": 2.5, "trivia": 3.0,
    "hiking": 3.0, "karaoke": 4.0, "bowling": 3.0,
    "board_games": 2.0, "mini_golf": 3.0, "dinner": 2.5, "bar": 3.5,
}


# ── Hard Constraints (unchanged) ──

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


def check_dealbreakers(users: list[User]) -> bool:
    """Return True if no dealbreaker conflicts exist between any pair of users."""
    for u in users:
        dbs = set(u.dealbreakers or [])
        if not dbs:
            continue
        for other in users:
            if u.id == other.id:
                continue
            if "smoking" in dbs and (other.smoking or "") == "regularly":
                return False
            if "heavy_drinking" in dbs and (other.drinking or "") == "regularly":
                return False
            if "too_quiet" in dbs and (other.social_energy or 3) <= 1:
                return False
            if "too_loud" in dbs and (other.social_energy or 3) >= 5:
                return False
    return True


def check_location_compatible(users: list[User]) -> bool:
    """Return True if all users are within each other's preferred max distance."""
    located = [(u, u.latitude, u.longitude) for u in users if u.latitude and u.longitude]
    for i in range(len(located)):
        ua, lat_a, lon_a = located[i]
        for j in range(i + 1, len(located)):
            ub, lat_b, lon_b = located[j]
            dist = haversine_km(lat_a, lon_a, lat_b, lon_b)
            max_dist = min(
                ua.preferred_max_distance_km or 25,
                ub.preferred_max_distance_km or 25,
            )
            if dist > max_dist:
                return False
    return True


def _check_blocked(users: list[User], blocked_set: set[tuple[uuid.UUID, uuid.UUID]]) -> bool:
    """Return True if no blocked pairs exist in the group."""
    for i in range(len(users)):
        for j in range(i + 1, len(users)):
            if (users[i].id, users[j].id) in blocked_set or (users[j].id, users[i].id) in blocked_set:
                return False
    return True


def check_all_hard_constraints(
    users: list[User],
    blocked_set: set[tuple[uuid.UUID, uuid.UUID]],
) -> bool:
    """Check age, dealbreakers, location, and blocked pairs."""
    if not check_age_compatibility(users):
        return False
    if not check_dealbreakers(users):
        return False
    if not check_location_compatible(users):
        return False
    if not _check_blocked(users, blocked_set):
        return False
    return True


# ── Group Quality Function (Q) ──

def compute_group_quality(group_users: list[User], activity: str, weights: dict) -> float:
    """Score = sum of weighted group-level components."""
    scores = group_users
    if not scores:
        return 0.0

    # AttCohesion: -variance of attractiveness scores (HIGHER IS BETTER when variance is LOW)
    att_scores = [u.attractiveness_score or 5.0 for u in scores]
    att_cohesion = -variance(att_scores) if len(att_scores) > 1 else 0

    # RoleDiversity: proportion of unique roles + catalyst bonus
    roles: set[str] = set()
    for u in scores:
        for r in (u.group_role or []):
            if r:
                roles.add(r)
    role_div = (len(roles) / len(scores)) * 5 if scores else 0
    has_catalyst = any(
        r in ("catalyst", "Catalyst", "Gets conversation started",
              "starts_conversations", "gets_everyone_hyped")
        for r in roles
    )
    role_div += 3.0 if has_catalyst else 0

    # EnergyBalance: moderate diversity, optimal std ~ 1.0
    energies = [u.social_energy or 3 for u in scores]
    energy_std = stdev(energies) if len(energies) > 1 else 0
    energy_balance = max(0, 3.0 - abs(energy_std - 1.0) * 2)

    # PersonalityDiv: count unique (values_vector, energy_bucket, role) combos
    combos: set[tuple] = set()
    for u in scores:
        vv = tuple(u.values_vector) if u.values_vector else ()
        eb = (u.social_energy or 3) // 2
        gr = tuple(sorted(u.group_role)) if u.group_role else ()
        combos.add((vv, eb, gr))
    personality_div = (len(combos) / len(scores)) * 5 if scores else 0

    # IntentAlignment
    intents = [u.relationship_intent for u in scores if u.relationship_intent]
    if len(set(intents)) == 1:
        intent_align = 3.0
    elif "open" in intents:
        intent_align = 1.5
    else:
        intent_align = 0.0

    # ActivityFit
    ideal = IDEAL_ENERGY_MAP.get(activity, 3.0)
    mean_energy = mean(energies) if energies else 3.0
    activity_fit = max(0, 3.0 - abs(mean_energy - ideal))

    # ValuesBaseline: moderate cross-gender Hamming distance
    males = [u for u in scores if u.gender == "male"]
    females = [u for u in scores if u.gender == "female"]
    hamming_dists: list[int] = []
    for m in males:
        for f in females:
            if m.values_vector and f.values_vector and len(m.values_vector) == 6 and len(f.values_vector) == 6:
                hamming_dists.append(sum(a != b for a, b in zip(m.values_vector, f.values_vector)))
    avg_hamming = mean(hamming_dists) if hamming_dists else 3.0
    values_baseline = max(0, 3.0 - abs(avg_hamming - 2.5) * 1.5)

    # FrictionScore
    friction = 0.0
    diets = [u.diet for u in scores if u.diet]
    if "vegan" in diets and "no_restrictions" in diets:
        friction += 1.0
    if "halal" in diets and "no_restrictions" in diets:
        friction += 0.5

    # Weighted sum
    w = weights
    Q = (w.get("att_cohesion", 5.0) * att_cohesion
       + w.get("role_diversity", 3.0) * role_div
       + w.get("energy_balance", 1.5) * energy_balance
       + w.get("personality_div", 2.5) * personality_div
       + w.get("intent_alignment", 2.0) * intent_align
       + w.get("activity_fit", 1.5) * activity_fit
       + w.get("values_baseline", 1.5) * values_baseline
       - w.get("friction", 1.5) * friction)
    return Q


# ── Config Loading ──

async def load_weights(db: AsyncSession) -> dict:
    """Load matching weights from algorithm_config table, fall back to defaults."""
    result = await db.execute(
        select(AlgorithmConfig).where(AlgorithmConfig.key == "matching_weights")
    )
    config = result.scalar_one_or_none()
    if config and isinstance(config.value, dict):
        merged = dict(DEFAULT_WEIGHTS)
        merged.update(config.value)
        return merged
    return dict(DEFAULT_WEIGHTS)


# ── Pre-group Helpers ──

def get_overlapping_slots(
    requests: list[DateRequest],
) -> dict[tuple, list[DateRequest]]:
    """Group requests by (date, time_window) where they share availability."""
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


# ── Blocked Pairs Batch Loading ──

async def _load_blocked_set(
    user_ids: list[uuid.UUID], db: AsyncSession,
) -> set[tuple[uuid.UUID, uuid.UUID]]:
    """Pre-load all blocked pairs among the given users for O(1) lookups."""
    if len(user_ids) < 2:
        return set()
    result = await db.execute(
        select(BlockedPair).where(
            or_(
                BlockedPair.blocker_id.in_(user_ids),
                BlockedPair.blocked_id.in_(user_ids),
            )
        )
    )
    pairs = result.scalars().all()
    user_set = set(user_ids)
    blocked: set[tuple[uuid.UUID, uuid.UUID]] = set()
    for bp in pairs:
        if bp.blocker_id in user_set and bp.blocked_id in user_set:
            blocked.add((bp.blocker_id, bp.blocked_id))
            blocked.add((bp.blocked_id, bp.blocker_id))
    return blocked


# ── Greedy Group Formation ──

def _greedy_form_groups(
    males: list[User],
    females: list[User],
    activity: str,
    weights: dict,
    blocked_set: set[tuple[uuid.UUID, uuid.UUID]],
    pregroup_map: dict[uuid.UUID, set[uuid.UUID]],
    epsilon: float,
) -> list[tuple[list[User], bool]]:
    """
    Greedy group formation with epsilon-greedy exploration.
    Returns list of (group_users, is_explore).
    Groups of 4 (2M+2F) by default. Groups of 6 (3M+3F) only when pre-groups force it.
    """
    avail_males = list(males)
    avail_females = list(females)
    random.shuffle(avail_males)
    random.shuffle(avail_females)

    user_by_id: dict[uuid.UUID, User] = {u.id: u for u in males + females}
    groups: list[tuple[list[User], bool]] = []
    assigned: set[uuid.UUID] = set()

    # Phase 1: Place pre-group clusters
    seen_clusters: set[frozenset[uuid.UUID]] = set()

    for uid in list(pregroup_map.keys()):
        if uid not in user_by_id or uid in assigned:
            continue
        cluster_ids = _get_pregroup_cluster(uid, pregroup_map)
        key = frozenset(cluster_ids)
        if key in seen_clusters:
            continue
        seen_clusters.add(key)

        cluster_males = [user_by_id[cid] for cid in cluster_ids
                         if cid in user_by_id and user_by_id[cid].gender == "male" and cid not in assigned]
        cluster_females = [user_by_id[cid] for cid in cluster_ids
                           if cid in user_by_id and user_by_id[cid].gender == "female" and cid not in assigned]

        if not cluster_males and not cluster_females:
            continue

        # Determine half-size: at least 2 per gender, more if cluster requires it
        half = max(len(cluster_males), len(cluster_females), 2)
        if half > 3:
            continue  # Cannot fit cluster in any valid group (max 3M+3F)

        needed_males = half - len(cluster_males)
        needed_females = half - len(cluster_females)

        fill_male_pool = [u for u in avail_males if u.id not in assigned and u.id not in cluster_ids]
        fill_female_pool = [u for u in avail_females if u.id not in assigned and u.id not in cluster_ids]

        if len(fill_male_pool) < needed_males or len(fill_female_pool) < needed_females:
            continue

        best_score = float('-inf')
        best_fill: Optional[tuple[list[User], list[User]]] = None

        attempts = min(50, max(1, len(fill_male_pool) * len(fill_female_pool)))
        for _ in range(attempts):
            fill_m = random.sample(fill_male_pool, needed_males) if needed_males > 0 else []
            fill_f = random.sample(fill_female_pool, needed_females) if needed_females > 0 else []
            group = cluster_males + fill_m + cluster_females + fill_f

            if check_all_hard_constraints(group, blocked_set):
                # Verify pre-group constraints are met within this group
                group_ids = {u.id for u in group}
                pregroup_ok = True
                for u in group:
                    required = pregroup_map.get(u.id)
                    if required and not required.issubset(group_ids):
                        pregroup_ok = False
                        break
                if not pregroup_ok:
                    continue

                score = compute_group_quality(group, activity, weights)
                if score > best_score:
                    best_score = score
                    best_fill = (fill_m, fill_f)

        if best_fill:
            fill_m, fill_f = best_fill
            group = cluster_males + fill_m + cluster_females + fill_f
            groups.append((group, False))
            for u in group:
                assigned.add(u.id)

    # Phase 2: Form groups of 4 (2M+2F) from remaining users
    remaining_males = [u for u in avail_males if u.id not in assigned]
    remaining_females = [u for u in avail_females if u.id not in assigned]
    half = 2

    while len(remaining_males) >= half and len(remaining_females) >= half:
        is_explore = random.random() < epsilon

        if is_explore:
            m_sample = random.sample(remaining_males, half)
            f_sample = random.sample(remaining_females, half)
            group = m_sample + f_sample
            if check_all_hard_constraints(group, blocked_set):
                groups.append((group, True))
                group_ids = {u.id for u in group}
                remaining_males = [u for u in remaining_males if u.id not in group_ids]
                remaining_females = [u for u in remaining_females if u.id not in group_ids]
                continue
            # Fall through to scored approach if random group is invalid

        best_score = float('-inf')
        best_group: Optional[list[User]] = None

        if len(remaining_males) <= 6 and len(remaining_females) <= 6:
            # Small pool: enumerate all combinations
            for m_combo in combinations(remaining_males, half):
                for f_combo in combinations(remaining_females, half):
                    group = list(m_combo) + list(f_combo)
                    if not check_all_hard_constraints(group, blocked_set):
                        continue
                    score = compute_group_quality(group, activity, weights)
                    if score > best_score:
                        best_score = score
                        best_group = group
        else:
            # Larger pool: sample candidates
            n_candidates = min(100, len(remaining_males) * len(remaining_females))
            for _ in range(n_candidates):
                m_sample = random.sample(remaining_males, half)
                f_sample = random.sample(remaining_females, half)
                group = m_sample + f_sample
                if not check_all_hard_constraints(group, blocked_set):
                    continue
                score = compute_group_quality(group, activity, weights)
                if score > best_score:
                    best_score = score
                    best_group = group

        if best_group:
            groups.append((best_group, False))
            group_ids = {u.id for u in best_group}
            remaining_males = [u for u in remaining_males if u.id not in group_ids]
            remaining_females = [u for u in remaining_females if u.id not in group_ids]
        else:
            break

    return groups


# ── Local Search (2-opt) ──

def _local_search_2opt(
    groups: list[tuple[list[User], bool]],
    activity: str,
    weights: dict,
    blocked_set: set[tuple[uuid.UUID, uuid.UUID]],
    pregroup_map: dict[uuid.UUID, set[uuid.UUID]],
) -> list[tuple[list[User], bool]]:
    """Iteratively swap one male or one female between group pairs. Keep if total Q improves."""
    groups = list(groups)
    if len(groups) < 2:
        return groups

    improved = True
    while improved:
        improved = False
        for i in range(len(groups)):
            if improved:
                break
            for j in range(i + 1, len(groups)):
                if improved:
                    break
                g1_users, g1_explore = groups[i]
                g2_users, g2_explore = groups[j]

                current_q = (compute_group_quality(g1_users, activity, weights)
                           + compute_group_quality(g2_users, activity, weights))

                g1_males = [u for u in g1_users if u.gender == "male"]
                g1_females = [u for u in g1_users if u.gender == "female"]
                g2_males = [u for u in g2_users if u.gender == "male"]
                g2_females = [u for u in g2_users if u.gender == "female"]

                # Try swapping males
                for m1 in g1_males:
                    if pregroup_map.get(m1.id):
                        continue
                    for m2 in g2_males:
                        if pregroup_map.get(m2.id):
                            continue
                        new_g1 = [u for u in g1_users if u.id != m1.id] + [m2]
                        new_g2 = [u for u in g2_users if u.id != m2.id] + [m1]

                        if not check_all_hard_constraints(new_g1, blocked_set):
                            continue
                        if not check_all_hard_constraints(new_g2, blocked_set):
                            continue

                        new_q = (compute_group_quality(new_g1, activity, weights)
                               + compute_group_quality(new_g2, activity, weights))
                        if new_q > current_q:
                            groups[i] = (new_g1, g1_explore)
                            groups[j] = (new_g2, g2_explore)
                            improved = True
                            break
                    if improved:
                        break

                if improved:
                    break

                # Try swapping females
                for f1 in g1_females:
                    if pregroup_map.get(f1.id):
                        continue
                    for f2 in g2_females:
                        if pregroup_map.get(f2.id):
                            continue
                        new_g1 = [u for u in g1_users if u.id != f1.id] + [f2]
                        new_g2 = [u for u in g2_users if u.id != f2.id] + [f1]

                        if not check_all_hard_constraints(new_g1, blocked_set):
                            continue
                        if not check_all_hard_constraints(new_g2, blocked_set):
                            continue

                        new_q = (compute_group_quality(new_g1, activity, weights)
                               + compute_group_quality(new_g2, activity, weights))
                        if new_q > current_q:
                            groups[i] = (new_g1, g1_explore)
                            groups[j] = (new_g2, g2_explore)
                            improved = True
                            break
                    if improved:
                        break

    return groups


# ── Main Entry Point ──

async def run_batch_matching(db: AsyncSession) -> list[DateGroup]:
    """Run the batch matching algorithm to form date groups from pending requests."""
    # 1. Load config weights
    weights = await load_weights(db)
    epsilon = weights.get("epsilon", 0.15)
    num_restarts = int(weights.get("num_restarts", 20))

    # 2. Fetch all pending requests with relationships
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

    user_map: dict[uuid.UUID, User] = {}
    request_map: dict[uuid.UUID, DateRequest] = {}
    for req in all_requests:
        user_map[req.user_id] = req.user
        request_map[req.user_id] = req

    # 3. Group by activity
    activity_groups: dict[str, list[DateRequest]] = defaultdict(list)
    for req in all_requests:
        activity_groups[req.activity].append(req)

    formed_groups: list[DateGroup] = []
    assigned_user_ids: set[uuid.UUID] = set()

    # 4. Process each activity
    for activity, requests in activity_groups.items():
        slot_groups = get_overlapping_slots(requests)

        for (slot_date, slot_time), slot_requests in slot_groups.items():
            available_reqs = [r for r in slot_requests if r.user_id not in assigned_user_ids]

            male_users = [user_map[r.user_id] for r in available_reqs if user_map[r.user_id].gender == "male"]
            female_users = [user_map[r.user_id] for r in available_reqs if user_map[r.user_id].gender == "female"]

            if len(male_users) < 2 or len(female_users) < 2:
                continue

            all_pool_ids = [u.id for u in male_users + female_users]
            blocked_set = await _load_blocked_set(all_pool_ids, db)
            pregroup_map = _build_pregroup_map(available_reqs)

            # 5. Run multiple restarts, keep best assignment
            best_total_q = float('-inf')
            best_assignment: Optional[list[tuple[list[User], bool]]] = None

            for _ in range(num_restarts):
                assignment = _greedy_form_groups(
                    male_users, female_users, activity, weights,
                    blocked_set, pregroup_map, epsilon,
                )
                assignment = _local_search_2opt(
                    assignment, activity, weights, blocked_set, pregroup_map,
                )
                total_q = sum(compute_group_quality(g, activity, weights) for g, _ in assignment)
                if total_q > best_total_q:
                    best_total_q = total_q
                    best_assignment = assignment

            if not best_assignment:
                continue

            # 6. Create groups in DB
            for group_users, is_explore in best_assignment:
                group_uids = [u.id for u in group_users]

                if any(uid in assigned_user_ids for uid in group_uids):
                    continue

                date_group = DateGroup(
                    activity=activity,
                    scheduled_date=slot_date,
                    scheduled_time=slot_time,
                    status="upcoming",
                    is_explore=is_explore,
                )
                db.add(date_group)
                await db.flush()

                for uid in group_uids:
                    req = request_map.get(uid)
                    member = GroupMember(
                        group_id=date_group.id,
                        user_id=uid,
                        date_request_id=req.id if req else None,
                    )
                    db.add(member)

                for uid in group_uids:
                    req = request_map.get(uid)
                    if req:
                        req.status = "matched"

                chat_room = ChatRoom(
                    room_type="group",
                    group_id=date_group.id,
                )
                db.add(chat_room)
                await db.flush()

                for uid in group_uids:
                    participant = ChatParticipant(
                        room_id=chat_room.id,
                        user_id=uid,
                    )
                    db.add(participant)

                member_names = [user_map[uid].first_name for uid in group_uids if uid in user_map]

                from app.services.chat_ai_service import send_welcome_message
                await send_welcome_message(
                    room_id=chat_room.id,
                    activity=date_group.activity,
                    member_names=member_names,
                    scheduled_date=str(date_group.scheduled_date) if date_group.scheduled_date else "",
                    scheduled_time=date_group.scheduled_time or "",
                    db=db,
                )

                assigned_user_ids.update(group_uids)
                formed_groups.append(date_group)

    await db.commit()

    refreshed: list[DateGroup] = []
    for grp in formed_groups:
        result = await db.execute(
            select(DateGroup)
            .where(DateGroup.id == grp.id)
            .options(selectinload(DateGroup.members).selectinload(GroupMember.user))
        )
        refreshed.append(result.scalar_one())

    return refreshed
