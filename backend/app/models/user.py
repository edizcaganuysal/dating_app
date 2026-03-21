import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    university_domain: Mapped[str] = mapped_column(String(100))
    is_email_verified: Mapped[bool] = mapped_column(default=False)
    email_otp: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)
    is_selfie_verified: Mapped[bool] = mapped_column(default=False)
    is_admin: Mapped[bool] = mapped_column(default=False)
    is_suspended: Mapped[bool] = mapped_column(default=False)
    no_show_count: Mapped[int] = mapped_column(default=0)
    gender: Mapped[str] = mapped_column(String(10))
    age: Mapped[int] = mapped_column()
    program: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    year_of_study: Mapped[Optional[int]] = mapped_column(nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(nullable=True)
    photo_urls: Mapped[list] = mapped_column(JSON, default=list)
    interests: Mapped[list] = mapped_column(JSON, default=list)
    age_range_min: Mapped[int] = mapped_column(default=18)
    age_range_max: Mapped[int] = mapped_column(default=30)
    attractiveness_score: Mapped[float] = mapped_column(default=5.0)
    elo_score: Mapped[float] = mapped_column(default=1000.0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    vibe_answers: Mapped[list["VibeAnswer"]] = relationship(back_populates="user")


class VibeAnswer(Base):
    __tablename__ = "vibe_answers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    question: Mapped[str] = mapped_column(String(500))
    answer: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="vibe_answers")
