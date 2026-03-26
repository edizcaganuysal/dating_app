import logging
import uuid
from statistics import mean, stdev, variance

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.algorithm_config import AlgorithmConfig
from app.models.analytics import GroupOutcome
from app.models.chat import ChatMessage
from app.models.group import DateGroup, GroupMember
from app.models.match import Match
from app.models.report import FeedbackRating, RomanticInterest
from app.models.second_date import SecondDate
from app.models.user import User
from app.services.matching_service import DEFAULT_WEIGHTS, IDEAL_ENERGY_MAP

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

logger = logging.getLogger(__name__)

REWARD_WEIGHTS = {
    "romantic_interest": 0.20,
    "mutual_match": 0.25,
    "group_chemistry": 0.10,
    "activity_fit": 0.05,
    "direct_message": 0.05,
    "second_date_proposed": 0.10,
    "second_date_accepted": 0.15,
    "followup_positive": 0.10,
}

WEIGHT_KEYS = [
    "att_cohesion", "role_diversity", "energy_balance", "personality_div",
    "intent_alignment", "activity_fit", "values_baseline", "friction",
]


def _compute_feature_values(users: list[User], activity: str) -> list[float]:
    """Compute the 8 unweighted feature values matching compute_group_quality components."""
    if not users:
        return [0.0] * 8

    att_scores = [u.attractiveness_score or 5.0 for u in users]
    att_cohesion = -variance(att_scores) if len(att_scores) > 1 else 0.0

    roles: set[str] = set()
    for u in users:
        for r in (u.group_role or []):
            if r:
                roles.add(r)
    role_div = (len(roles) / len(users)) * 5 if users else 0.0
    has_catalyst = any(
        r in ("catalyst", "Catalyst", "Gets conversation started",
              "starts_conversations", "gets_everyone_hyped")
        for r in roles
    )
    role_div += 3.0 if has_catalyst else 0

    energies = [u.social_energy or 3 for u in users]
    energy_std = stdev(energies) if len(energies) > 1 else 0
    energy_balance = max(0, 3.0 - abs(energy_std - 1.0) * 2)

    combos: set[tuple] = set()
    for u in users:
        vv = tuple(u.values_vector) if u.values_vector else ()
        eb = (u.social_energy or 3) // 2
        gr = tuple(sorted(u.group_role)) if u.group_role else ()
        combos.add((vv, eb, gr))
    personality_div = (len(combos) / len(users)) * 5 if users else 0.0

    intents = [u.relationship_intent for u in users if u.relationship_intent]
    if len(set(intents)) == 1:
        intent_align = 3.0
    elif "open" in intents:
        intent_align = 1.5
    else:
        intent_align = 0.0

    ideal = IDEAL_ENERGY_MAP.get(activity, 3.0)
    mean_energy = mean(energies) if energies else 3.0
    activity_fit_val = max(0, 3.0 - abs(mean_energy - ideal))

    males = [u for u in users if u.gender == "male"]
    females = [u for u in users if u.gender == "female"]
    hamming_dists: list[int] = []
    for m in males:
        for f in females:
            if m.values_vector and f.values_vector and len(m.values_vector) == 6 and len(f.values_vector) == 6:
                hamming_dists.append(sum(a != b for a, b in zip(m.values_vector, f.values_vector)))
    avg_hamming = mean(hamming_dists) if hamming_dists else 3.0
    values_baseline = max(0, 3.0 - abs(avg_hamming - 2.5) * 1.5)

    friction = 0.0
    diets = [u.diet for u in users if u.diet]
    if "vegan" in diets and "no_restrictions" in diets:
        friction += 1.0
    if "halal" in diets and "no_restrictions" in diets:
        friction += 0.5

    return [att_cohesion, role_div, energy_balance, personality_div,
            intent_align, activity_fit_val, values_baseline, friction]


def _manual_ols(X: list[list[float]], y: list[float]) -> list[float]:
    """Solve OLS via normal equations: beta = (X^T X)^-1 X^T y."""
    n = len(X)
    p = len(X[0])

    XtX = [[sum(X[k][i] * X[k][j] for k in range(n)) for j in range(p)] for i in range(p)]
    Xty = [sum(X[k][i] * y[k] for k in range(n)) for i in range(p)]

    # Gauss-Jordan elimination on augmented [XtX | I]
    aug = [XtX[i][:] + [1.0 if i == j else 0.0 for j in range(p)] for i in range(p)]

    for col in range(p):
        max_row = col
        for row in range(col + 1, p):
            if abs(aug[row][col]) > abs(aug[max_row][col]):
                max_row = row
        aug[col], aug[max_row] = aug[max_row], aug[col]

        pivot = aug[col][col]
        if abs(pivot) < 1e-12:
            aug[col][col] += 1e-6
            pivot = aug[col][col]

        for j in range(2 * p):
            aug[col][j] /= pivot

        for row in range(p):
            if row == col:
                continue
            factor = aug[row][col]
            for j in range(2 * p):
                aug[row][j] -= factor * aug[col][j]

    XtX_inv = [[aug[i][j + p] for j in range(p)] for i in range(p)]
    beta = [sum(XtX_inv[i][j] * Xty[j] for j in range(p)) for i in range(p)]
    return beta


async def compute_reward(db: AsyncSession, group_id: uuid.UUID) -> float:
    """Compute composite reward signal R for a completed group date."""
    result = await db.execute(
        select(GroupMember)
        .where(GroupMember.group_id == group_id)
        .options(selectinload(GroupMember.user))
    )
    members = list(result.scalars().all())
    if not members:
        return 0.0

    users = [m.user for m in members]
    males = [u for u in users if u.gender == "male"]
    females = [u for u in users if u.gender == "female"]
    cross_gender_pairs = max(len(males) * len(females), 1)

    # r1: romantic interests >= "interested" / cross-gender pairs
    result = await db.execute(
        select(func.count()).select_from(RomanticInterest).where(
            RomanticInterest.group_id == group_id,
            RomanticInterest.interest_level.in_(["interested", "very_interested"]),
        )
    )
    n_interested = result.scalar() or 0
    r1 = min(n_interested / cross_gender_pairs, 1.0)

    # r2: mutual matches / cross-gender pairs
    result = await db.execute(
        select(func.count()).select_from(Match).where(Match.group_id == group_id)
    )
    n_matches = result.scalar() or 0
    r2 = min(n_matches / cross_gender_pairs, 1.0)

    # r3: mean group_chemistry_rating / 5.0
    result = await db.execute(
        select(func.avg(FeedbackRating.group_chemistry_rating)).where(
            FeedbackRating.group_id == group_id,
            FeedbackRating.group_chemistry_rating.isnot(None),
        )
    )
    avg_chemistry = result.scalar()
    r3 = (avg_chemistry / 5.0) if avg_chemistry is not None else 0.0

    # r4: mean activity_fit_rating / 5.0
    result = await db.execute(
        select(func.avg(FeedbackRating.activity_fit_rating)).where(
            FeedbackRating.group_id == group_id,
            FeedbackRating.activity_fit_rating.isnot(None),
        )
    )
    avg_activity_fit = result.scalar()
    r4 = (avg_activity_fit / 5.0) if avg_activity_fit is not None else 0.0

    # r5: any message in direct chat for matches from this group
    r5 = 0.0
    result = await db.execute(
        select(Match.chat_room_id).where(
            Match.group_id == group_id,
            Match.chat_room_id.isnot(None),
        )
    )
    match_room_ids = [row[0] for row in result.all()]
    if match_room_ids:
        result = await db.execute(
            select(ChatMessage.id).where(
                ChatMessage.room_id.in_(match_room_ids),
            ).limit(1)
        )
        if result.first() is not None:
            r5 = 1.0

    # r6 & r7: SecondDate statuses for matches from this group
    r6 = 0.0
    r7 = 0.0
    result = await db.execute(
        select(Match.id).where(Match.group_id == group_id)
    )
    match_ids = [row[0] for row in result.all()]
    if match_ids:
        result = await db.execute(
            select(SecondDate.status).where(SecondDate.match_id.in_(match_ids))
        )
        sd_statuses = {row[0] for row in result.all()}
        if "proposed" in sd_statuses:
            r6 = 1.0
        if "accepted" in sd_statuses:
            r7 = 1.0

    # r8: follow-up check-in positive (no model exists yet)
    r8 = 0.0

    R = (REWARD_WEIGHTS["romantic_interest"] * r1
       + REWARD_WEIGHTS["mutual_match"] * r2
       + REWARD_WEIGHTS["group_chemistry"] * r3
       + REWARD_WEIGHTS["activity_fit"] * r4
       + REWARD_WEIGHTS["direct_message"] * r5
       + REWARD_WEIGHTS["second_date_proposed"] * r6
       + REWARD_WEIGHTS["second_date_accepted"] * r7
       + REWARD_WEIGHTS["followup_positive"] * r8)

    return R


async def update_weights(db: AsyncSession) -> dict:
    """Learn optimal matching weights from group outcome data via OLS regression."""
    result = await db.execute(
        select(GroupOutcome)
        .options(
            selectinload(GroupOutcome.group)
            .selectinload(DateGroup.members)
            .selectinload(GroupMember.user)
        )
    )
    outcomes = list(result.scalars().all())

    # Load current weights
    current_weights: dict = {}
    result = await db.execute(
        select(AlgorithmConfig).where(AlgorithmConfig.key == "matching_weights")
    )
    config = result.scalar_one_or_none()
    if config and isinstance(config.value, dict):
        current_weights = dict(config.value)
    for k in WEIGHT_KEYS:
        if k not in current_weights:
            current_weights[k] = DEFAULT_WEIGHTS.get(k, 1.0)

    if len(outcomes) < 20:
        logger.info("Only %d group outcomes, need >= 20 for weight learning", len(outcomes))
        return current_weights

    # Build feature matrix X and reward vector y
    X_data: list[list[float]] = []
    y_data: list[float] = []

    for outcome in outcomes:
        group = outcome.group
        if not group or not group.members:
            continue

        users = [m.user for m in group.members if m.user]
        if not users:
            continue

        features = _compute_feature_values(users, outcome.activity)
        reward = await compute_reward(db, outcome.group_id)

        X_data.append([1.0] + features)  # prepend intercept
        y_data.append(reward)

    if len(X_data) < 20:
        logger.info("Only %d valid data points, need >= 20", len(X_data))
        return current_weights

    # OLS regression
    try:
        if HAS_NUMPY:
            X = np.array(X_data)
            y = np.array(y_data)
            beta = np.linalg.lstsq(X, y, rcond=None)[0]
            coefficients = beta[1:].tolist()
        else:
            beta = _manual_ols(X_data, y_data)
            coefficients = beta[1:]
    except Exception as e:
        logger.warning("OLS regression failed: %s", e)
        return current_weights

    # Blend: 0.7 * |learned| + 0.3 * current (regularize toward current)
    current_total = sum(current_weights.get(k, DEFAULT_WEIGHTS.get(k, 1.0)) for k in WEIGHT_KEYS)
    new_weights: dict = {}

    for i, key in enumerate(WEIGHT_KEYS):
        current_val = current_weights.get(key, DEFAULT_WEIGHTS.get(key, 1.0))
        learned_val = abs(coefficients[i]) if i < len(coefficients) else current_val
        new_weights[key] = 0.7 * learned_val + 0.3 * current_val

    # Normalize so weights sum to roughly the same total as before
    new_total = sum(new_weights[k] for k in WEIGHT_KEYS)
    if new_total > 0:
        scale = current_total / new_total
        for k in WEIGHT_KEYS:
            new_weights[k] = round(new_weights[k] * scale, 4)

    # Preserve non-weight config
    new_weights["epsilon"] = current_weights.get("epsilon", DEFAULT_WEIGHTS.get("epsilon", 0.15))
    new_weights["num_restarts"] = current_weights.get("num_restarts", DEFAULT_WEIGHTS.get("num_restarts", 20))

    # Persist
    if config:
        config.value = new_weights
    else:
        config = AlgorithmConfig(key="matching_weights", value=new_weights)
        db.add(config)
    await db.flush()

    logger.info("Updated matching weights: %s", new_weights)
    return new_weights


async def update_activity_energy_map(db: AsyncSession) -> dict:
    """Learn ideal energy levels per activity from outcome data."""
    result = await db.execute(select(GroupOutcome))
    outcomes = list(result.scalars().all())

    if not outcomes:
        return {}

    # Group rewards by activity and energy bucket
    activity_buckets: dict[str, dict[str, list[float]]] = {}

    for outcome in outcomes:
        activity = outcome.activity
        if activity not in activity_buckets:
            activity_buckets[activity] = {"low": [], "medium": [], "high": []}

        if outcome.mean_energy < 2.5:
            bucket = "low"
        elif outcome.mean_energy <= 3.5:
            bucket = "medium"
        else:
            bucket = "high"

        reward = await compute_reward(db, outcome.group_id)
        activity_buckets[activity][bucket].append(reward)

    # Pick best bucket per activity
    bucket_energy = {"low": 2.0, "medium": 3.0, "high": 4.0}
    ideal_map: dict[str, float] = {}

    for activity, buckets in activity_buckets.items():
        best_bucket = "medium"
        best_reward = -1.0

        for bucket_name, rewards in buckets.items():
            if rewards:
                avg_reward = mean(rewards)
                if avg_reward > best_reward:
                    best_reward = avg_reward
                    best_bucket = bucket_name

        ideal_map[activity] = bucket_energy[best_bucket]

    # Persist
    result = await db.execute(
        select(AlgorithmConfig).where(AlgorithmConfig.key == "activity_energy_map")
    )
    config = result.scalar_one_or_none()
    if config:
        config.value = ideal_map
    else:
        config = AlgorithmConfig(key="activity_energy_map", value=ideal_map)
        db.add(config)
    await db.flush()

    logger.info("Updated activity energy map: %s", ideal_map)
    return ideal_map
