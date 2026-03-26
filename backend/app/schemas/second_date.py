import datetime as dt
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SecondDateResponse(BaseModel):
    id: uuid.UUID
    match_id: uuid.UUID
    proposer_id: Optional[uuid.UUID] = None
    activity: str
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    proposed_date: dt.date
    proposed_time: str
    status: str
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class SecondDateRespondRequest(BaseModel):
    accepted: bool
