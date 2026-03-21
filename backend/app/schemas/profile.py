import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class VibeAnswerCreate(BaseModel):
    question: str
    answer: str


class ProfileCreate(BaseModel):
    bio: str = Field(max_length=500)
    program: str
    year_of_study: int = Field(ge=1, le=6)
    photo_urls: list[str] = Field(min_length=3)
    interests: list[str] = Field(min_length=1)
    vibe_answers: list[VibeAnswerCreate] = Field(min_length=5, max_length=5)
    age_range_min: int = Field(ge=18, le=99)
    age_range_max: int = Field(ge=18, le=99)


class ProfileUpdate(BaseModel):
    bio: Optional[str] = Field(default=None, max_length=500)
    program: Optional[str] = None
    year_of_study: Optional[int] = Field(default=None, ge=1, le=6)
    photo_urls: Optional[list[str]] = Field(default=None, min_length=3)
    interests: Optional[list[str]] = Field(default=None, min_length=1)
    age_range_min: Optional[int] = Field(default=None, ge=18, le=99)
    age_range_max: Optional[int] = Field(default=None, ge=18, le=99)


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
    is_selfie_verified: bool

    model_config = ConfigDict(from_attributes=True)


class PrivateProfileResponse(PublicProfileResponse):
    age_range_min: int
    age_range_max: int
