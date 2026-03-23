"""
Models for the AI batch matching pipeline.
MatchingBatch represents a group of ~100 users clustered for AI matching.
ProposedGroup represents an AI-suggested group pending admin approval.
"""

import datetime as dt
import uuid
from typing import Optional

from sqlalchemy import Date, Float, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MatchingBatch(Base):
    __tablename__ = "matching_batches"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    activity: Mapped[str] = mapped_column(String(100))
    time_slot_date: Mapped[dt.date] = mapped_column(Date)
    time_slot_hours: Mapped[list] = mapped_column(JSON, default=list)  # [18, 19, 20]

    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending → scoring → scored → admin_review → approved → executed

    user_count: Mapped[int] = mapped_column(default=0)
    trigger_type: Mapped[str] = mapped_column(String(20), default="threshold")
    # threshold | 2h_incomplete | 6h_forced | manual

    # Location center of this batch
    center_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    center_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # AI scoring results
    ai_score_payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ai_model_used: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_tokens_used: Mapped[Optional[int]] = mapped_column(nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    proposed_groups: Mapped[list["ProposedGroup"]] = relationship(back_populates="batch", cascade="all, delete-orphan")


class ProposedGroup(Base):
    __tablename__ = "proposed_groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matching_batches.id"))
    activity: Mapped[str] = mapped_column(String(100))
    scheduled_date: Mapped[dt.date] = mapped_column(Date)
    scheduled_time: Mapped[str] = mapped_column(String(20))  # e.g. "19:00"

    status: Mapped[str] = mapped_column(String(20), default="proposed")
    # proposed → approved → rejected → executed

    ai_compatibility_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    batch: Mapped["MatchingBatch"] = relationship(back_populates="proposed_groups")
    members: Mapped[list["ProposedGroupMember"]] = relationship(back_populates="proposed_group", cascade="all, delete-orphan")


class ProposedGroupMember(Base):
    __tablename__ = "proposed_group_members"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    proposed_group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("proposed_groups.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    date_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_requests.id"))

    proposed_group: Mapped["ProposedGroup"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()
    date_request: Mapped["DateRequest"] = relationship()


# Needed for type resolution
from app.models.user import User  # noqa: E402, F811
from app.models.date_request import DateRequest  # noqa: E402, F811
