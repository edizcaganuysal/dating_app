import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    room_type: Mapped[str] = mapped_column(String(10))  # "group" or "direct"
    group_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("date_groups.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    participants: Mapped[list["ChatParticipant"]] = relationship(back_populates="room")
    messages: Mapped[list["ChatMessage"]] = relationship(back_populates="room")


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_rooms.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    room: Mapped["ChatRoom"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship()


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_rooms.id"))
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    content: Mapped[str] = mapped_column()
    message_type: Mapped[str] = mapped_column(String(10), default="text")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    room: Mapped["ChatRoom"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship()


# Needed for type resolution
from app.models.user import User  # noqa: E402, F811
from app.models.group import DateGroup  # noqa: E402, F811
