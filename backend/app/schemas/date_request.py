import datetime as dt
import uuid
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ActivityType(str, Enum):
    dinner = "dinner"
    bar = "bar"
    bowling = "bowling"
    karaoke = "karaoke"
    board_games = "board_games"
    ice_skating = "ice_skating"
    hiking = "hiking"
    cooking_class = "cooking_class"
    trivia_night = "trivia_night"
    mini_golf = "mini_golf"
    escape_room = "escape_room"
    art_gallery = "art_gallery"
    picnic = "picnic"
    museum = "museum"


class TimeWindow(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    evening = "evening"
    night = "night"


class AvailabilitySlotCreate(BaseModel):
    date: dt.date
    time_window: TimeWindow


class AvailabilitySlotResponse(BaseModel):
    id: uuid.UUID
    date: dt.date
    time_window: str

    model_config = ConfigDict(from_attributes=True)


class DateRequestCreate(BaseModel):
    group_size: Literal[4, 6]
    activity: ActivityType
    availability_slots: list[AvailabilitySlotCreate] = Field(min_length=1)
    pre_group_friend_ids: list[uuid.UUID] = Field(default_factory=list, max_length=2)


class DateRequestUpdate(BaseModel):
    activity: Optional[ActivityType] = None
    availability_slots: Optional[list[AvailabilitySlotCreate]] = Field(default=None, min_length=1)


class DateRequestResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    group_size: int
    activity: str
    status: str
    availability_slots: list[AvailabilitySlotResponse] = []
    pre_group_friend_ids: list[uuid.UUID] = []
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
