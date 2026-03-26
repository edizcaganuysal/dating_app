import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SecondDate(Base):
    __tablename__ = "second_dates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matches.id"))
    proposer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    activity: Mapped[str] = mapped_column(String(100))
    venue_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    venue_address: Mapped[Optional[str]] = mapped_column(nullable=True)
    proposed_date: Mapped[date] = mapped_column(Date)
    proposed_time: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="suggested")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    match: Mapped["Match"] = relationship()
    proposer: Mapped[Optional["User"]] = relationship()


# Needed for type resolution
from app.models.match import Match  # noqa: E402, F811
from app.models.user import User  # noqa: E402, F811
