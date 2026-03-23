import random
import string
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _generate_friend_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    friend_code: Mapped[str] = mapped_column(String(6), unique=True, default=_generate_friend_code)
    university_domain: Mapped[str] = mapped_column(String(100))
    is_email_verified: Mapped[bool] = mapped_column(default=False)
    email_otp: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)
    is_admin: Mapped[bool] = mapped_column(default=False)
    is_suspended: Mapped[bool] = mapped_column(default=False)
    no_show_count: Mapped[int] = mapped_column(default=0)
    gender: Mapped[str] = mapped_column(String(10))
    age: Mapped[int] = mapped_column()

    # Profile basics
    program: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    year_of_study: Mapped[Optional[int]] = mapped_column(nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(nullable=True)  # Legacy, replaced by prompts
    photo_urls: Mapped[list] = mapped_column(JSON, default=list)
    interests: Mapped[list] = mapped_column(JSON, default=list)
    prompts: Mapped[list] = mapped_column(JSON, default=list)  # [{prompt: str, answer: str}]

    # Push notifications
    push_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Selfie verification
    selfie_status: Mapped[str] = mapped_column(String(20), default="none")  # none, pending, verified, rejected
    selfie_urls: Mapped[list] = mapped_column(JSON, default=list)  # URLs of selfie photos
    # Keep is_selfie_verified for backward compat (derived from selfie_status)
    is_selfie_verified: Mapped[bool] = mapped_column(default=False)

    # Onboarding path
    onboarding_path: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # quick, thorough
    relationship_intent: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # casual, serious, open

    # Personality (thorough path)
    social_energy: Mapped[Optional[int]] = mapped_column(nullable=True)  # 1-5 (introvert to extrovert)
    humor_styles: Mapped[list] = mapped_column(JSON, default=list)  # [sarcastic, goofy, dry, dark, wholesome, witty]
    communication_pref: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # texter, caller, in_person
    conflict_style: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # talk_immediately, need_space, avoid

    # Lifestyle (thorough path)
    drinking: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # never, socially, regularly
    smoking: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # never, socially, regularly
    exercise: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # never, sometimes, often, daily
    diet: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # no_restrictions, vegetarian, vegan, halal, kosher, other
    sleep_schedule: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # early_bird, night_owl, depends

    # Social style (thorough path)
    group_role: Mapped[list] = mapped_column(JSON, default=list)  # [starts_conversations, tells_jokes, ...]
    ideal_group_size: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # intimate, medium, large

    # Dealbreakers (thorough path)
    dealbreakers: Mapped[list] = mapped_column(JSON, default=list)  # [smoking, heavy_drinking, ...]

    # Location (private — matching only, never exposed)
    latitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    location_updated_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    preferred_max_distance_km: Mapped[Optional[int]] = mapped_column(nullable=True, default=25)

    # Self-description (shown publicly)
    body_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # slim, athletic, average, curvy, muscular
    height_cm: Mapped[Optional[int]] = mapped_column(nullable=True)  # 140-210
    style_tags: Mapped[list] = mapped_column(JSON, default=list)  # casual, preppy, streetwear, artsy, sporty

    # Preferences about others (private — never shown)
    pref_body_type: Mapped[list] = mapped_column(JSON, default=list)
    pref_height_range: Mapped[list] = mapped_column(JSON, default=list)  # [min_cm, max_cm]
    pref_style: Mapped[list] = mapped_column(JSON, default=list)
    pref_social_energy_range: Mapped[list] = mapped_column(JSON, default=list)  # [min, max] 1-5
    pref_humor_styles: Mapped[list] = mapped_column(JSON, default=list)
    pref_communication: Mapped[list] = mapped_column(JSON, default=list)

    # Preferences (private)
    age_range_min: Mapped[int] = mapped_column(default=18)
    age_range_max: Mapped[int] = mapped_column(default=30)

    # Scoring (internal)
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
