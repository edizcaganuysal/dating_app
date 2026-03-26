from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.waitlist import WaitlistEntry

router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])


class WaitlistRequest(BaseModel):
    name: str
    email: EmailStr
    university: str


class WaitlistResponse(BaseModel):
    message: str
    position: int


class WaitlistCountResponse(BaseModel):
    count: int


@router.post("", response_model=WaitlistResponse, status_code=status.HTTP_201_CREATED)
async def join_waitlist(data: WaitlistRequest, db: AsyncSession = Depends(get_db)):
    # Check for duplicate email
    existing = await db.execute(
        select(WaitlistEntry).where(WaitlistEntry.email == data.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already on the waitlist.",
        )

    entry = WaitlistEntry(
        name=data.name.strip(),
        email=data.email.lower().strip(),
        university=data.university.strip(),
    )
    db.add(entry)
    await db.commit()

    # Get position (total count)
    result = await db.execute(select(func.count(WaitlistEntry.id)))
    position = result.scalar() or 1

    return WaitlistResponse(
        message=f"You're #{position} on the waitlist!",
        position=position,
    )


@router.get("/count", response_model=WaitlistCountResponse)
async def get_waitlist_count(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count(WaitlistEntry.id)))
    count = result.scalar() or 0
    return WaitlistCountResponse(count=count)
