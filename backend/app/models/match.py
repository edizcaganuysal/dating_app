import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_groups.id"))
    user1_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    user2_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    chat_room_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("chat_rooms.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["DateGroup"] = relationship()
    user1: Mapped["User"] = relationship(foreign_keys=[user1_id])
    user2: Mapped["User"] = relationship(foreign_keys=[user2_id])
    chat_room: Mapped[Optional["ChatRoom"]] = relationship()


# Needed for type resolution
from app.models.user import User  # noqa: E402, F811
from app.models.group import DateGroup  # noqa: E402, F811
from app.models.chat import ChatRoom  # noqa: E402, F811
