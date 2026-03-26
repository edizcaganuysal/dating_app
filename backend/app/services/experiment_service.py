import hashlib
import uuid
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.experiment import Experiment, ExperimentAssignment
from app.models.analytics import GroupOutcome
from app.models.match import Match
from app.models.report import FeedbackRating


async def assign_variant(
    db: AsyncSession, user_id: uuid.UUID, experiment_name: str
) -> str:
    """Deterministically assign a user to an experiment variant.

    Uses hash-based assignment for consistency: the same user always gets
    the same variant for a given experiment, even across sessions.
    """
    # Look up experiment
    result = await db.execute(
        select(Experiment).where(
            Experiment.name == experiment_name,
            Experiment.is_active == True,  # noqa: E712
        )
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise ValueError(f"Active experiment '{experiment_name}' not found")

    # Check if already assigned
    result = await db.execute(
        select(ExperimentAssignment).where(
            ExperimentAssignment.user_id == user_id,
            ExperimentAssignment.experiment_id == experiment.id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing.variant

    # Deterministic assignment via hash
    hash_input = f"{user_id}:{experiment_name}"
    hash_value = int(hashlib.sha256(hash_input.encode()).hexdigest(), 16) % 100

    # Map hash to variant based on cumulative weights
    variants = experiment.variants
    weights = experiment.variant_weights

    if not variants or not weights or len(variants) != len(weights):
        raise ValueError(f"Experiment '{experiment_name}' has invalid variants/weights")

    cumulative = 0.0
    assigned_variant = variants[-1]  # fallback to last variant
    for variant, weight in zip(variants, weights):
        cumulative += weight * 100
        if hash_value < cumulative:
            assigned_variant = variant
            break

    # Create assignment record
    assignment = ExperimentAssignment(
        user_id=user_id,
        experiment_id=experiment.id,
        variant=assigned_variant,
    )
    db.add(assignment)
    await db.flush()
    return assigned_variant


async def get_variant(
    db: AsyncSession, user_id: uuid.UUID, experiment_name: str
) -> Optional[str]:
    """Get a user's assigned variant for an experiment, or None if not assigned."""
    result = await db.execute(
        select(ExperimentAssignment)
        .join(Experiment, ExperimentAssignment.experiment_id == Experiment.id)
        .where(
            ExperimentAssignment.user_id == user_id,
            Experiment.name == experiment_name,
        )
    )
    assignment = result.scalar_one_or_none()
    return assignment.variant if assignment else None


async def compute_experiment_metrics(
    db: AsyncSession, experiment_name: str
) -> dict:
    """Compute metrics per variant for an experiment.

    Returns per-variant: n_users, n_matches, match_rate, mean_experience_rating.
    Includes a simple two-proportion z-test for significance between first two variants.
    """
    result = await db.execute(
        select(Experiment).where(Experiment.name == experiment_name)
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise ValueError(f"Experiment '{experiment_name}' not found")

    variant_metrics = []

    for variant_name in experiment.variants:
        # Count users in this variant
        result = await db.execute(
            select(func.count(ExperimentAssignment.id)).where(
                ExperimentAssignment.experiment_id == experiment.id,
                ExperimentAssignment.variant == variant_name,
            )
        )
        n_users = result.scalar() or 0

        # Get user IDs in this variant
        result = await db.execute(
            select(ExperimentAssignment.user_id).where(
                ExperimentAssignment.experiment_id == experiment.id,
                ExperimentAssignment.variant == variant_name,
            )
        )
        user_ids = [row[0] for row in result.all()]

        # Count matches involving these users
        n_matches = 0
        mean_rating = None

        if user_ids:
            result = await db.execute(
                select(func.count(Match.id)).where(
                    (Match.user1_id.in_(user_ids)) | (Match.user2_id.in_(user_ids))
                )
            )
            n_matches = result.scalar() or 0

            result = await db.execute(
                select(func.avg(FeedbackRating.experience_rating)).where(
                    FeedbackRating.user_id.in_(user_ids)
                )
            )
            avg = result.scalar()
            mean_rating = round(float(avg), 2) if avg else None

        match_rate = round(n_matches / n_users, 4) if n_users > 0 else 0.0

        variant_metrics.append({
            "variant": variant_name,
            "n_users": n_users,
            "n_matches": n_matches,
            "match_rate": match_rate,
            "mean_experience_rating": mean_rating,
        })

    # Two-proportion z-test between first two variants (if both have data)
    p_value = None
    if len(variant_metrics) >= 2:
        v1 = variant_metrics[0]
        v2 = variant_metrics[1]
        if v1["n_users"] > 0 and v2["n_users"] > 0:
            p1 = v1["match_rate"]
            p2 = v2["match_rate"]
            n1 = v1["n_users"]
            n2 = v2["n_users"]
            p_pool = (v1["n_matches"] + v2["n_matches"]) / (n1 + n2) if (n1 + n2) > 0 else 0
            if p_pool > 0 and p_pool < 1:
                import math
                se = math.sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))
                if se > 0:
                    z = (p1 - p2) / se
                    # Approximate two-tailed p-value from z-score
                    p_value = round(2 * (1 - _norm_cdf(abs(z))), 4)

    return {
        "experiment_name": experiment_name,
        "is_active": experiment.is_active,
        "variants": variant_metrics,
        "p_value": p_value,
        "significant": p_value < 0.05 if p_value is not None else None,
    }


def _norm_cdf(x: float) -> float:
    """Approximate standard normal CDF using error function."""
    import math
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))
