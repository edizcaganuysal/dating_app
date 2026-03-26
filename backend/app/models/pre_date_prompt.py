import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PreDatePrompt(Base):
    __tablename__ = "pre_date_prompts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("date_groups.id"))
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_rooms.id"))
    message: Mapped[str] = mapped_column()
    send_at: Mapped[datetime] = mapped_column()
    sent: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
