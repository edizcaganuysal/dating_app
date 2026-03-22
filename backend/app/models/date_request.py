import datetime as dt
import uuid
from typing import Optional

from sqlalchemy import Date, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DateRequest(Base):
    __tablename__ = "date_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    group_size: Mapped[int] = mapped_column()
    activity: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship()
    availability_slots: Mapped[list["AvailabilitySlot"]] = relationship(back_populates="date_request")
    pre_group_friends: Mapped[list["PreGroupFriend"]] = relationship(back_populates="date_request")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    date_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_requests.id"))
    date: Mapped[dt.date] = mapped_column(Date)
    time_window: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    date_request: Mapped["DateRequest"] = relationship(back_populates="availability_slots")


class PreGroupFriend(Base):
    __tablename__ = "pre_group_friends"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    date_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_requests.id"))
    friend_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    date_request: Mapped["DateRequest"] = relationship(back_populates="pre_group_friends")
    friend: Mapped["User"] = relationship()


class DateRequestTemplate(Base):
    __tablename__ = "date_request_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(100))
    activities: Mapped[list] = mapped_column(JSON, default=list)
    group_size: Mapped[int] = mapped_column(default=4)
    friend_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship()


# Needed for type resolution
from app.models.user import User  # noqa: E402, F811
