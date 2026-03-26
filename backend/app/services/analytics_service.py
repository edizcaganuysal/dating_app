import uuid
from statistics import mean, stdev
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent, GroupOutcome
from app.models.group import DateGroup, GroupMember
from app.models.match import Match
from app.models.report import FeedbackRating, RomanticInterest
from app.models.user import User


async def log_event(
    db: AsyncSession,
    user_id: uuid.UUID,
    event_type: str,
    event_data: Optional[dict] = None,
    session_id: Optional[str] = None,
) -> AnalyticsEvent:
    """Log an analytics event."""
    event = AnalyticsEvent(
        user_id=user_id,
        event_type=event_type,
        event_data=event_data or {},
        session_id=session_id,
    )
    db.add(event)
    await db.flush()
    return event


async def compute_group_outcome(
    db: AsyncSession, group_id: uuid.UUID
) -> GroupOutcome:
    """Compute and store outcome metrics for a completed group date."""
    # Get the group
    result = await db.execute(
        select(DateGroup).where(DateGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise ValueError(f"Group {group_id} not found")

    # Get group members with their user data
    result = await db.execute(
        select(GroupMember, User)
        .join(User, GroupMember.user_id == User.id)
        .where(GroupMember.group_id == group_id)
    )
    members = result.all()

    if not members:
        raise ValueError(f"No members found for group {group_id}")

    group_size = len(members)
    users = [row[1] for row in members]

    # Compute attractiveness stats
    attractiveness_scores = [u.attractiveness_score for u in users if u.attractiveness_score is not None]
    mean_att = mean(attractiveness_scores) if attractiveness_scores else 5.0
    std_att = stdev(attractiveness_scores) if len(attractiveness_scores) > 1 else 0.0

    # Compute energy stats
    energy_scores = [u.social_energy for u in users if u.social_energy is not None]
    mean_eng = mean(energy_scores) if energy_scores else 3.0
    std_eng = stdev(energy_scores) if len(energy_scores) > 1 else 0.0

    # Compute role diversity
    roles = {u.group_role[0] if isinstance(u.group_role, list) and u.group_role else u.group_role
             for u in users if u.group_role}
    roles.discard(None)
    role_diversity = len(roles) / group_size if group_size > 0 else 0.0

    # Count mutual matches
    result = await db.execute(
        select(Match).where(Match.group_id == group_id)
    )
    matches = list(result.scalars().all())
    n_mutual_matches = len(matches)

    # Count romantic interests (for interest density)
    result = await db.execute(
        select(RomanticInterest).where(
            RomanticInterest.group_id == group_id,
            RomanticInterest.interest_level.in_(["interested", "very_interested"]),
        )
    )
    interests = list(result.scalars().all())

    # Get feedback ratings
    result = await db.execute(
        select(FeedbackRating).where(FeedbackRating.group_id == group_id)
    )
    ratings = list(result.scalars().all())
    mean_exp = mean([r.experience_rating for r in ratings]) if ratings else None

    # Create group outcome record
    outcome = GroupOutcome(
        group_id=group_id,
        activity=group.activity,
        group_size=group_size,
        mean_attractiveness=mean_att,
        std_attractiveness=std_att,
        mean_energy=mean_eng,
        std_energy=std_eng,
        role_diversity_score=role_diversity,
        n_mutual_matches=n_mutual_matches,
        n_soft_matches=0,  # Updated when soft match system is built (Phase 3)
        mean_experience_rating=mean_exp,
        mean_chemistry_rating=None,  # Added in Phase 3 feedback redesign
        conversion_rate=None,  # Updated from 2-week check-in (Phase 6)
    )
    db.add(outcome)
    await db.flush()
    return outcome


async def get_gender_ratio(db: AsyncSession) -> dict:
    """Get current gender ratio across all active users."""
    result = await db.execute(
        select(
            User.gender,
            func.count(User.id),
        )
        .where(User.is_suspended == False)  # noqa: E712
        .group_by(User.gender)
    )
    counts = {row[0]: row[1] for row in result.all()}

    male_count = counts.get("male", 0)
    female_count = counts.get("female", 0)
    total = male_count + female_count

    if total == 0:
        ratio = 0.5
    else:
        ratio = male_count / total

    if 0.45 <= ratio <= 0.55:
        status = "balanced"
    elif ratio > 0.55:
        status = "male_heavy"
    else:
        status = "female_heavy"

    return {
        "male_count": male_count,
        "female_count": female_count,
        "total": total,
        "male_ratio": round(ratio, 3),
        "status": status,
    }


async def get_baseline_metrics(db: AsyncSession) -> dict:
    """Compute baseline metrics across all data."""
    # Total users
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar() or 0

    # Total completed date groups
    result = await db.execute(
        select(func.count(DateGroup.id)).where(DateGroup.status == "completed")
    )
    total_dates = result.scalar() or 0

    # Total matches
    result = await db.execute(select(func.count(Match.id)))
    total_matches = result.scalar() or 0

    # Overall conversion rate (matches / unique date attendees)
    result = await db.execute(select(func.count(func.distinct(GroupMember.user_id))))
    total_attendees = result.scalar() or 0
    # Users who got at least one match
    result = await db.execute(
        select(func.count(func.distinct(Match.user1_id)))
    )
    matched_user1s = result.scalar() or 0
    result = await db.execute(
        select(func.count(func.distinct(Match.user2_id)))
    )
    matched_user2s = result.scalar() or 0

    overall_conversion = 0.0
    if total_attendees > 0:
        # Approximate unique matched users (upper bound)
        overall_conversion = min(1.0, (matched_user1s + matched_user2s) / total_attendees)

    # Conversion by activity
    result = await db.execute(
        select(
            DateGroup.activity,
            func.count(func.distinct(DateGroup.id)).label("n_groups"),
            func.count(func.distinct(Match.id)).label("n_matches"),
        )
        .outerjoin(Match, Match.group_id == DateGroup.id)
        .where(DateGroup.status == "completed")
        .group_by(DateGroup.activity)
    )
    conversion_by_activity = {}
    for row in result.all():
        conversion_by_activity[row[0]] = {
            "n_groups": row[1],
            "n_matches": row[2],
        }

    # Conversion by group size
    result = await db.execute(
        select(
            func.count(GroupMember.id).label("group_size"),
            GroupMember.group_id,
        )
        .group_by(GroupMember.group_id)
    )
    group_sizes = {}
    for row in result.all():
        size = row[0]
        group_sizes.setdefault(size, 0)
        group_sizes[size] += 1
    conversion_by_group_size = {str(k): v for k, v in group_sizes.items()}

    # Female retention: women who attended a date and created another request
    result = await db.execute(
        select(func.count(func.distinct(GroupMember.user_id)))
        .join(User, GroupMember.user_id == User.id)
        .where(User.gender == "female")
    )
    female_attendees = result.scalar() or 0

    return {
        "total_users": total_users,
        "total_dates": total_dates,
        "total_matches": total_matches,
        "total_attendees": total_attendees,
        "overall_conversion_rate": round(overall_conversion, 4),
        "conversion_by_activity": conversion_by_activity,
        "conversion_by_group_size": conversion_by_group_size,
        "female_attendees": female_attendees,
    }
