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
    cooking_class = "cooking_class"
    trivia_night = "trivia_night"
    mini_golf = "mini_golf"
    escape_room = "escape_room"
    arcade = "arcade"


# Legacy enum kept for backward compat; new flow uses time_hours
class TimeWindow(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    evening = "evening"
    night = "night"


# Map preset windows to hour ranges
TIME_WINDOW_HOURS = {
    "morning": [8, 9, 10, 11],
    "afternoon": [12, 13, 14, 15, 16, 17],
    "evening": [18, 19, 20, 21],
    "night": [22, 23, 0, 1],
}


class AvailabilitySlotCreate(BaseModel):
    date: dt.date
    time_window: Optional[TimeWindow] = None  # Legacy, still accepted
    time_hours: list[int] = Field(default_factory=list)  # [18, 19, 20, 21]

    def get_hours(self) -> list[int]:
        """Return time_hours, falling back to time_window expansion."""
        if self.time_hours:
            return self.time_hours
        if self.time_window:
            return TIME_WINDOW_HOURS.get(self.time_window.value, [18, 19, 20, 21])
        return [18, 19, 20, 21]  # default to evening


class AvailabilitySlotResponse(BaseModel):
    id: uuid.UUID
    date: dt.date
    time_window: Optional[str] = None
    time_hours: list[int] = []

    model_config = ConfigDict(from_attributes=True)


class DateRequestCreate(BaseModel):
    group_size: Literal[4, 6]
    activity: ActivityType
    availability_slots: list[AvailabilitySlotCreate] = Field(min_length=1)
    pre_group_friend_ids: list[uuid.UUID] = Field(default_factory=list, max_length=2)


class DateRequestUpdate(BaseModel):
    activity: Optional[ActivityType] = None
    group_size: Optional[Literal[4, 6]] = None
    availability_slots: Optional[list[AvailabilitySlotCreate]] = Field(default=None, min_length=1)
    pre_group_friend_ids: Optional[list[uuid.UUID]] = None


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
