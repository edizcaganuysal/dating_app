import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class VibeAnswerCreate(BaseModel):
    question: str
    answer: str


class PromptAnswer(BaseModel):
    prompt: str
    answer: str


class ProfileCreate(BaseModel):
    # Onboarding path
    onboarding_path: str = "quick"  # quick or thorough

    # Basics
    program: str
    year_of_study: int = Field(ge=1, le=6)
    relationship_intent: str = "open"  # casual, serious, open

    # Photos
    photo_urls: list[str] = Field(min_length=3)

    # Interests
    interests: list[str] = Field(min_length=1)

    # Prompts (replaces bio)
    prompts: list[PromptAnswer] = Field(default_factory=list)

    # Vibe answers
    vibe_answers: list[VibeAnswerCreate] = Field(min_length=5, max_length=5)

    # Preferences (private)
    age_range_min: int = Field(ge=18, le=99)
    age_range_max: int = Field(ge=18, le=99)

    # Thorough-only fields (all optional — only present for thorough path)
    social_energy: Optional[int] = Field(default=None, ge=1, le=5)
    humor_styles: list[str] = Field(default_factory=list)
    communication_pref: Optional[str] = None
    conflict_style: Optional[str] = None
    drinking: Optional[str] = None
    smoking: Optional[str] = None
    exercise: Optional[str] = None
    diet: Optional[str] = None
    sleep_schedule: Optional[str] = None
    group_role: list[str] = Field(default_factory=list)
    ideal_group_size: Optional[str] = None
    dealbreakers: list[str] = Field(default_factory=list)

    # Legacy compat
    bio: Optional[str] = Field(default=None, max_length=500)


class ProfileUpdate(BaseModel):
    program: Optional[str] = None
    year_of_study: Optional[int] = Field(default=None, ge=1, le=6)
    relationship_intent: Optional[str] = None
    photo_urls: Optional[list[str]] = Field(default=None, min_length=3)
    interests: Optional[list[str]] = Field(default=None, min_length=1)
    prompts: Optional[list[PromptAnswer]] = None
    age_range_min: Optional[int] = Field(default=None, ge=18, le=99)
    age_range_max: Optional[int] = Field(default=None, ge=18, le=99)
    social_energy: Optional[int] = Field(default=None, ge=1, le=5)
    humor_styles: Optional[list[str]] = None
    communication_pref: Optional[str] = None
    conflict_style: Optional[str] = None
    drinking: Optional[str] = None
    smoking: Optional[str] = None
    exercise: Optional[str] = None
    diet: Optional[str] = None
    sleep_schedule: Optional[str] = None
    group_role: Optional[list[str]] = None
    ideal_group_size: Optional[str] = None
    dealbreakers: Optional[list[str]] = None
    bio: Optional[str] = Field(default=None, max_length=500)


class PublicProfileResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    age: int
    gender: str
    program: Optional[str] = None
    year_of_study: Optional[int] = None
    bio: Optional[str] = None
    photo_urls: list = []
    interests: list = []
    prompts: list = []
    relationship_intent: Optional[str] = None
    selfie_status: str = "none"
    is_selfie_verified: bool = False
    onboarding_path: Optional[str] = None

    # Personality (shown publicly if filled)
    social_energy: Optional[int] = None
    humor_styles: list = []
    communication_pref: Optional[str] = None
    group_role: list = []

    # Lifestyle (shown publicly if filled)
    drinking: Optional[str] = None
    smoking: Optional[str] = None
    exercise: Optional[str] = None
    diet: Optional[str] = None
    sleep_schedule: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PrivateProfileResponse(PublicProfileResponse):
    age_range_min: int
    age_range_max: int
    conflict_style: Optional[str] = None
    ideal_group_size: Optional[str] = None
    dealbreakers: list = []
