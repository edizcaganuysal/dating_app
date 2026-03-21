import datetime as dt

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.group import DateGroup, GroupMember
from app.models.report import FeedbackRating
from app.models.user import User

NOSHOW_WINDOW_HOURS = 48


async def mark_groups_completed(db: AsyncSession) -> int:
    """Mark past upcoming groups as completed. Returns count of updated groups."""
    now = dt.datetime.now(dt.timezone.utc)
    result = await db.execute(
        select(DateGroup).where(
            DateGroup.status == "upcoming",
            DateGroup.scheduled_date < now.date(),
        )
    )
    groups = result.scalars().all()
    count = 0
    for group in groups:
        group.status = "completed"
        count += 1
    if count:
        await db.commit()
    return count


async def check_noshows(db: AsyncSession) -> list[User]:
    """Find members of completed groups who haven't submitted feedback within the window.
    Increment their no_show_count and suspend if >= 3. Returns list of flagged users.
    """
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = now - dt.timedelta(hours=NOSHOW_WINDOW_HOURS)

    # Find completed groups whose scheduled_date is far enough in the past
    result = await db.execute(
        select(DateGroup).where(
            DateGroup.status == "completed",
            DateGroup.scheduled_date <= cutoff.date(),
        )
    )
    completed_groups = result.scalars().all()

    flagged_users: list[User] = []

    for group in completed_groups:
        # Get all members of this group
        members_result = await db.execute(
            select(GroupMember).where(GroupMember.group_id == group.id)
        )
        members = members_result.scalars().all()

        # Get user_ids who submitted feedback for this group
        feedback_result = await db.execute(
            select(FeedbackRating.user_id).where(FeedbackRating.group_id == group.id)
        )
        submitted_user_ids = set(feedback_result.scalars().all())

        # Flag members who didn't submit feedback
        for member in members:
            if member.user_id not in submitted_user_ids:
                user_result = await db.execute(
                    select(User).where(User.id == member.user_id)
                )
                user = user_result.scalar_one_or_none()
                if user and not user.is_suspended:
                    user.no_show_count += 1
                    if user.no_show_count >= 3:
                        user.is_suspended = True
                    flagged_users.append(user)

    if flagged_users:
        await db.commit()

    return flagged_users
