import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    content: str
    message_type: str
    created_at: datetime


class ParticipantInfo(BaseModel):
    user_id: uuid.UUID
    first_name: str


class LastMessage(BaseModel):
    content: str
    created_at: datetime


class ChatRoomResponse(BaseModel):
    id: uuid.UUID
    room_type: str
    group_id: Optional[uuid.UUID] = None
    participants: list[ParticipantInfo]
    last_message: Optional[LastMessage] = None
    created_at: datetime
