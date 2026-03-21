import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RomanticInterestInput(BaseModel):
    user_id: uuid.UUID
    interested: bool


class FeedbackCreate(BaseModel):
    experience_rating: int = Field(..., ge=1, le=5)
    romantic_interests: list[RomanticInterestInput]
    block_user_ids: list[uuid.UUID] = Field(default_factory=list)
    report_user_ids: list[uuid.UUID] = Field(default_factory=list)
    report_category: Optional[str] = None


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    experience_rating: int
    submitted_at: datetime
