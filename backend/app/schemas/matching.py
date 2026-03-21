import datetime as dt
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class GroupMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    age: int
    gender: str
    program: Optional[str] = None
    bio: Optional[str] = None
    photo_urls: list = []
    interests: list = []
    is_selfie_verified: bool = False

    model_config = ConfigDict(from_attributes=True)


class DateGroupResponse(BaseModel):
    id: uuid.UUID
    activity: str
    scheduled_date: dt.date
    scheduled_time: str
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    status: str
    members: list[GroupMemberResponse] = []
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class BatchMatchingResponse(BaseModel):
    groups_formed: int
    groups: list[DateGroupResponse]
