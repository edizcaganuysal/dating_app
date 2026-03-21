import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ReportCreate(BaseModel):
    reported_user_id: uuid.UUID
    group_id: Optional[uuid.UUID] = None
    category: str = Field(..., max_length=50)
    description: Optional[str] = None


class ReportUpdate(BaseModel):
    status: str = Field(..., max_length=20)
    admin_notes: Optional[str] = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reporter_id: uuid.UUID
    reported_id: uuid.UUID
    group_id: Optional[uuid.UUID] = None
    category: str
    description: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class NoshowUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    no_show_count: int
    is_suspended: bool
