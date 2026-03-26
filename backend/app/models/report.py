import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FeedbackRating(Base):
    __tablename__ = "feedback_ratings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_groups.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    experience_rating: Mapped[int] = mapped_column()
    group_chemistry_rating: Mapped[Optional[int]] = mapped_column(nullable=True)
    activity_fit_rating: Mapped[Optional[int]] = mapped_column(nullable=True)
    reflection_tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["DateGroup"] = relationship()
    user: Mapped["User"] = relationship()


class RomanticInterest(Base):
    __tablename__ = "romantic_interests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_groups.id"))
    from_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    to_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    interest_level: Mapped[str] = mapped_column(String(20), default="not_interested")
    friend_interest: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["DateGroup"] = relationship()
    from_user: Mapped["User"] = relationship(foreign_keys=[from_user_id])
    to_user: Mapped["User"] = relationship(foreign_keys=[to_user_id])


class SoftMatch(Base):
    __tablename__ = "soft_matches"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_groups.id"))
    interested_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    maybe_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reveal_at: Mapped[datetime] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["DateGroup"] = relationship()
    interested_user: Mapped["User"] = relationship(foreign_keys=[interested_user_id])
    maybe_user: Mapped["User"] = relationship(foreign_keys=[maybe_user_id])


class BlockedPair(Base):
    __tablename__ = "blocked_pairs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    blocker_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    blocked_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    blocker: Mapped["User"] = relationship(foreign_keys=[blocker_id])
    blocked: Mapped["User"] = relationship(foreign_keys=[blocked_id])


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    reporter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    reported_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    group_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("date_groups.id"), nullable=True)
    category: Mapped[str] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    admin_notes: Mapped[Optional[str]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    reporter: Mapped["User"] = relationship(foreign_keys=[reporter_id])
    reported: Mapped["User"] = relationship(foreign_keys=[reported_id])
    group: Mapped[Optional["DateGroup"]] = relationship()


# Needed for type resolution
from app.models.user import User  # noqa: E402, F811
from app.models.group import DateGroup  # noqa: E402, F811
