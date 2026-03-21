import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.profile import PublicProfileResponse


class GroupMemberDetailResponse(BaseModel):
    user_id: uuid.UUID
    profile: PublicProfileResponse

    model_config = ConfigDict(from_attributes=True)


class GroupDetailResponse(BaseModel):
    id: uuid.UUID
    activity: str
    scheduled_date: str
    scheduled_time: str
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    status: str
    members: list[GroupMemberDetailResponse]
    chat_room_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class IcebreakersResponse(BaseModel):
    prompts: list[str]


class VenueResponse(BaseModel):
    name: str
    address: str
    neighborhood: str
    price_range: str


class VenuesResponse(BaseModel):
    activity: str
    venues: list[VenueResponse]
