import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AdminUserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    gender: str
    age: int
    is_email_verified: bool
    is_selfie_verified: bool
    is_suspended: bool
    no_show_count: int
    created_at: datetime
    total_groups: int = 0
    total_matches: int = 0


class AdminUserListResponse(BaseModel):
    users: list[AdminUserSummary]
    total: int


class AdminGroupSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    activity: str
    scheduled_date: date
    scheduled_time: str
    status: str
    created_at: datetime


class AdminMatchSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    partner_id: uuid.UUID
    partner_name: str
    group_id: uuid.UUID
    created_at: datetime


class AdminReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    other_user_id: uuid.UUID
    other_user_name: str
    category: str
    status: str
    direction: str  # "filed" or "received"
    created_at: datetime


class AdminUserDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    gender: str
    age: int
    phone: Optional[str] = None
    university_domain: str
    program: Optional[str] = None
    year_of_study: Optional[int] = None
    bio: Optional[str] = None
    interests: list = []
    is_email_verified: bool
    is_selfie_verified: bool
    is_admin: bool
    is_suspended: bool
    no_show_count: int
    created_at: datetime
    updated_at: datetime
    groups: list[AdminGroupSummary] = []
    matches: list[AdminMatchSummary] = []
    reports: list[AdminReportSummary] = []


class AdminUserUpdate(BaseModel):
    is_suspended: Optional[bool] = None
    is_admin: Optional[bool] = None


class ManualGroupCreate(BaseModel):
    user_ids: list[uuid.UUID] = Field(..., min_length=4, max_length=6)
    activity: str = Field(..., max_length=100)
    scheduled_date: date
    scheduled_time: str = Field(..., max_length=20)


class PendingRequestUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    gender: str
    age: int
    program: Optional[str] = None
    interests: list = []


class PendingDateRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    group_size: int
    activity: str
    status: str
    created_at: datetime
    user: PendingRequestUser


class AnalyticsResponse(BaseModel):
    total_users: int
    active_users: int
    total_groups: int
    total_matches: int
    avg_experience_rating: Optional[float] = None
    total_reports_pending: int
    no_show_count_total: int


class VibeAnswerInput(BaseModel):
    question: str
    answer: str


class AdminUserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    phone: str = ""
    gender: str  # "male" or "female"
    age: int = Field(..., ge=18, le=99)
    program: str = ""
    year_of_study: int = Field(1, ge=1, le=6)
    bio: str = Field("", max_length=500)
    photo_urls: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    vibe_answers: list[VibeAnswerInput] = Field(default_factory=list)
    age_range_min: int = Field(18, ge=18, le=99)
    age_range_max: int = Field(30, ge=18, le=99)


class AdminDateRequestCreate(BaseModel):
    user_id: uuid.UUID
    group_size: int = Field(..., description="Must be 4 or 6")
    activity: str
    availability_slots: list[dict] = Field(..., min_length=1)  # [{date: str, time_window: str}]
    pre_group_friend_ids: list[uuid.UUID] = Field(default_factory=list, max_length=2)


class ExperimentCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    variants: list[str]
    variant_weights: list[float]
    start_date: datetime
    end_date: Optional[datetime] = None


class ExperimentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    variants: list
    variant_weights: list
    start_date: datetime
    end_date: Optional[datetime] = None
    is_active: bool
    created_at: datetime
