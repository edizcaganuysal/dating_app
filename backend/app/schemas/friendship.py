import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FriendRequestCreate(BaseModel):
    friend_id: uuid.UUID


class FriendCodeAdd(BaseModel):
    code: str


class FriendResponse(BaseModel):
    id: uuid.UUID  # friendship id
    user_id: uuid.UUID
    first_name: str
    last_name: str
    gender: str
    age: int
    program: str | None = None
    photo_urls: list = []

    model_config = ConfigDict(from_attributes=True)


class FriendshipResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    friend_id: uuid.UUID
    status: str
    created_at: datetime
    friend_name: str = ""

    model_config = ConfigDict(from_attributes=True)


class FriendSearchResult(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    gender: str
    age: int
    program: str | None = None

    model_config = ConfigDict(from_attributes=True)
