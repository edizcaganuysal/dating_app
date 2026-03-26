import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Index, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    event_data: Mapped[dict] = mapped_column(JSON, default=dict)
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship()

    __table_args__ = (
        Index("ix_analytics_events_user_type_date", "user_id", "event_type", "created_at"),
    )


class GroupOutcome(Base):
    __tablename__ = "group_outcomes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_groups.id"), unique=True)
    activity: Mapped[str] = mapped_column(String(100))
    group_size: Mapped[int] = mapped_column()
    mean_attractiveness: Mapped[float] = mapped_column()
    std_attractiveness: Mapped[float] = mapped_column()
    mean_energy: Mapped[float] = mapped_column()
    std_energy: Mapped[float] = mapped_column()
    role_diversity_score: Mapped[float] = mapped_column()
    n_mutual_matches: Mapped[int] = mapped_column(default=0)
    n_soft_matches: Mapped[int] = mapped_column(default=0)
    mean_experience_rating: Mapped[Optional[float]] = mapped_column(nullable=True)
    mean_chemistry_rating: Mapped[Optional[float]] = mapped_column(nullable=True)
    conversion_rate: Mapped[Optional[float]] = mapped_column(nullable=True)
    is_explore_group: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["DateGroup"] = relationship()


# Needed for type resolution
from app.models.user import User  # noqa: E402, F811
from app.models.group import DateGroup  # noqa: E402, F811
