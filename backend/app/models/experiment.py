import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Index, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    variants: Mapped[list] = mapped_column(JSON, default=list)
    variant_weights: Mapped[list] = mapped_column(JSON, default=list)
    start_date: Mapped[datetime] = mapped_column()
    end_date: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    assignments: Mapped[list["ExperimentAssignment"]] = relationship(back_populates="experiment")


class ExperimentAssignment(Base):
    __tablename__ = "experiment_assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    experiment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("experiments.id"))
    variant: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship()
    experiment: Mapped["Experiment"] = relationship(back_populates="assignments")

    __table_args__ = (
        UniqueConstraint("user_id", "experiment_id", name="uq_user_experiment"),
        Index("ix_experiment_assignments_exp_variant", "experiment_id", "variant"),
    )


# Needed for type resolution
from app.models.user import User  # noqa: E402, F811
