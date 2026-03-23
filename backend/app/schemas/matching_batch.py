import datetime as dt
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProposedGroupMemberResponse(BaseModel):
    user_id: uuid.UUID
    first_name: str = ""
    age: int = 0
    gender: str = ""
    program: Optional[str] = None
    photo_urls: list = []
    interests: list = []
    attractiveness_score: float = 5.0

    model_config = ConfigDict(from_attributes=True)


class ProposedGroupResponse(BaseModel):
    id: uuid.UUID
    activity: str
    scheduled_date: dt.date
    scheduled_time: str
    status: str
    ai_compatibility_score: float
    ai_reasoning: Optional[str] = None
    members: list[ProposedGroupMemberResponse] = []
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class MatchingBatchResponse(BaseModel):
    id: uuid.UUID
    activity: str
    time_slot_date: dt.date
    time_slot_hours: list[int] = []
    status: str
    user_count: int
    trigger_type: str
    center_lat: Optional[float] = None
    center_lng: Optional[float] = None
    proposed_groups_count: int = 0
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class MatchingBatchDetailResponse(MatchingBatchResponse):
    proposed_groups: list[ProposedGroupResponse] = []
    ai_model_used: Optional[str] = None
    ai_tokens_used: Optional[int] = None


class BatchApprovalRequest(BaseModel):
    approved_group_ids: list[uuid.UUID] = Field(default_factory=list)
    rejected_group_ids: list[uuid.UUID] = Field(default_factory=list)
