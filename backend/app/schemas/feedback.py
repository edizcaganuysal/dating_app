import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RomanticInterestInput(BaseModel):
    user_id: uuid.UUID
    interest_level: str = Field(..., pattern="^(not_interested|maybe|interested|very_interested)$")
    friend_interest: bool = False


class FeedbackCreate(BaseModel):
    experience_rating: int = Field(..., ge=1, le=5)
    group_chemistry_rating: Optional[int] = Field(None, ge=1, le=5)
    activity_fit_rating: Optional[int] = Field(None, ge=1, le=5)
    reflection_tags: list[str] = Field(default_factory=list)
    romantic_interests: list[RomanticInterestInput]
    block_user_ids: list[uuid.UUID] = Field(default_factory=list)
    report_user_ids: list[uuid.UUID] = Field(default_factory=list)
    report_category: Optional[str] = None


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    experience_rating: int
    group_chemistry_rating: Optional[int] = None
    activity_fit_rating: Optional[int] = None
    reflection_tags: list[str] = []
    submitted_at: datetime
