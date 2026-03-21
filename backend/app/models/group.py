import datetime as dt
import uuid
from typing import Optional

from sqlalchemy import Date, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DateGroup(Base):
    __tablename__ = "date_groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    activity: Mapped[str] = mapped_column(String(100))
    scheduled_date: Mapped[dt.date] = mapped_column(Date)
    scheduled_time: Mapped[str] = mapped_column(String(20))
    venue_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    venue_address: Mapped[Optional[str]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="upcoming")
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    members: Mapped[list["GroupMember"]] = relationship(back_populates="group")


class GroupMember(Base):
    __tablename__ = "group_members"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_groups.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    date_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("date_requests.id"), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    group: Mapped["DateGroup"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()
    date_request: Mapped[Optional["DateRequest"]] = relationship()


# Needed for type resolution
from app.models.user import User  # noqa: E402, F811
from app.models.date_request import DateRequest  # noqa: E402, F811
