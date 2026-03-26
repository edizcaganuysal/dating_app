import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class VibeAnswerCreate(BaseModel):
    question: str
    answer: str


class PromptAnswer(BaseModel):
    prompt: str
    answer: str


class LocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


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

    # Location (optional — collected in onboarding)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    preferred_max_distance_km: Optional[int] = Field(default=25, ge=1, le=200)

    # Self-description (optional)
    body_type: Optional[str] = None
    height_cm: Optional[int] = Field(default=None, ge=100, le=250)
    style_tags: list[str] = Field(default_factory=list)

    # Preferences about others (private, all truly optional)
    pref_body_type: Optional[list[str]] = Field(default_factory=list)
    pref_height_range: Optional[list[int]] = Field(default_factory=list)  # [min_cm, max_cm]
    pref_style: Optional[list[str]] = Field(default_factory=list)
    pref_social_energy_range: Optional[list[int]] = Field(default_factory=list)  # [min, max] 1-5
    pref_humor_styles: Optional[list[str]] = Field(default_factory=list)
    pref_communication: Optional[list[str]] = Field(default_factory=list)

    # Preferences (private)
    age_range_min: int = Field(ge=18, le=99)
    age_range_max: int = Field(ge=18, le=99)

    # Values assessment (6 binary ints)
    values_vector: list[int] = Field(default_factory=list)

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

    @field_validator('values_vector')
    @classmethod
    def validate_values_vector(cls, v):
        if v and len(v) != 6:
            raise ValueError('values_vector must have exactly 6 items')
        if v and not all(item in (0, 1) for item in v):
            raise ValueError('each item in values_vector must be 0 or 1')
        return v

    @field_validator('dealbreakers')
    @classmethod
    def validate_dealbreakers(cls, v):
        if v and len(v) > 3:
            raise ValueError('maximum 3 dealbreakers allowed')
        return v


class ProfileUpdate(BaseModel):
    program: Optional[str] = None
    year_of_study: Optional[int] = Field(default=None, ge=1, le=6)
    relationship_intent: Optional[str] = None
    values_vector: Optional[list[int]] = None
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

    @field_validator('values_vector')
    @classmethod
    def validate_values_vector(cls, v):
        if v and len(v) != 6:
            raise ValueError('values_vector must have exactly 6 items')
        if v and not all(item in (0, 1) for item in v):
            raise ValueError('each item in values_vector must be 0 or 1')
        return v

    @field_validator('dealbreakers')
    @classmethod
    def validate_dealbreakers(cls, v):
        if v and len(v) > 3:
            raise ValueError('maximum 3 dealbreakers allowed')
        return v

    # Location
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    preferred_max_distance_km: Optional[int] = Field(default=None, ge=1, le=200)

    # Self-description
    body_type: Optional[str] = None
    height_cm: Optional[int] = Field(default=None, ge=100, le=250)
    style_tags: Optional[list[str]] = None

    # Preferences about others
    pref_body_type: Optional[list[str]] = None
    pref_height_range: Optional[list[int]] = None
    pref_style: Optional[list[str]] = None
    pref_social_energy_range: Optional[list[int]] = None
    pref_humor_styles: Optional[list[str]] = None
    pref_communication: Optional[list[str]] = None


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

    # Self-description (shown publicly)
    body_type: Optional[str] = None
    height_cm: Optional[int] = None
    style_tags: list = []

    model_config = ConfigDict(from_attributes=True)


class PrivateProfileResponse(PublicProfileResponse):
    age_range_min: int
    age_range_max: int
    conflict_style: Optional[str] = None
    ideal_group_size: Optional[str] = None
    dealbreakers: list = []
    values_vector: list = []
    preferred_max_distance_km: Optional[int] = None

    # Preferences about others (PRIVATE — never in PublicProfileResponse)
    pref_body_type: list = []
    pref_height_range: list = []
    pref_style: list = []
    pref_social_energy_range: list = []
    pref_humor_styles: list = []
    pref_communication: list = []
