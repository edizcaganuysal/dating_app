import random
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.chat import ChatRoom
from app.models.group import DateGroup, GroupMember
from app.models.user import User
from app.services.notification_service import notify_group_reveal
from app.services.pre_date_prompt_service import schedule_pre_date_prompts
from app.schemas.group import (
    GroupDetailResponse,
    GroupMemberDetailResponse,
    IcebreakersResponse,
    VenueResponse,
    VenuesResponse,
)
from app.schemas.profile import PublicProfileResponse

router = APIRouter(prefix="/api/groups", tags=["groups"])

ICEBREAKER_PROMPTS = [
    "Everyone share your most controversial food take",
    "What's the worst first date you've ever been on?",
    "If you could have dinner with anyone, dead or alive, who?",
    "What's your go-to karaoke song?",
    "Hot take: what's an overrated movie?",
    "What's the most spontaneous thing you've ever done?",
    "Describe your ideal Sunday in 3 words",
    "What's a hill you'll die on?",
    "If you won the lottery tomorrow, what's the first thing you'd do?",
    "What's your comfort show you've rewatched way too many times?",
]

VENUE_SUGGESTIONS: dict[str, list[dict]] = {
    "dinner": [
        {"name": "Pai Northern Thai", "address": "18 Duncan St", "neighborhood": "Entertainment District", "price_range": "$$"},
        {"name": "Gusto 101", "address": "101 Portland St", "neighborhood": "King West", "price_range": "$$"},
        {"name": "Byblos", "address": "11 Duncan St", "neighborhood": "Entertainment District", "price_range": "$$$"},
        {"name": "Richmond Station", "address": "1 Richmond St W", "neighborhood": "Downtown", "price_range": "$$$"},
    ],
    "bar": [
        {"name": "Bar Raval", "address": "505 College St", "neighborhood": "Little Italy", "price_range": "$$"},
        {"name": "Civil Liberties", "address": "878 Bloor St W", "neighborhood": "Bloordale", "price_range": "$$"},
        {"name": "The Shameful Tiki Room", "address": "1378 Queen St W", "neighborhood": "Parkdale", "price_range": "$$"},
        {"name": "Birreria Volo", "address": "612 College St", "neighborhood": "Little Italy", "price_range": "$$"},
    ],
    "bowling": [
        {"name": "The Ballroom", "address": "145 John St", "neighborhood": "Entertainment District", "price_range": "$$"},
        {"name": "Playtime Bowl", "address": "33 Samor Rd", "neighborhood": "East York", "price_range": "$"},
    ],
    "karaoke": [
        {"name": "Koreatown Karaoke", "address": "680 Bloor St W", "neighborhood": "Koreatown", "price_range": "$"},
        {"name": "Sing Sing", "address": "67 Richmond St W", "neighborhood": "Downtown", "price_range": "$$"},
        {"name": "Supermarket", "address": "268 Augusta Ave", "neighborhood": "Kensington Market", "price_range": "$"},
    ],
    "board_games": [
        {"name": "Snakes & Lattes", "address": "600 Bloor St W", "neighborhood": "The Annex", "price_range": "$"},
        {"name": "Castle Board Game Cafe", "address": "460 College St", "neighborhood": "Little Italy", "price_range": "$"},
    ],
    "ice_skating": [
        {"name": "Natrel Rink", "address": "235 Queens Quay W", "neighborhood": "Harbourfront", "price_range": "$"},
        {"name": "Nathan Phillips Square Rink", "address": "100 Queen St W", "neighborhood": "Downtown", "price_range": "$"},
    ],
    "hiking": [
        {"name": "Scarborough Bluffs", "address": "1 Brimley Rd S", "neighborhood": "Scarborough", "price_range": "$"},
        {"name": "Rouge National Urban Park", "address": "25 Zoo Rd", "neighborhood": "Scarborough", "price_range": "$"},
        {"name": "Don Valley Trail", "address": "Pottery Rd", "neighborhood": "Don Valley", "price_range": "$"},
    ],
    "cooking_class": [
        {"name": "Dish Cooking Studio", "address": "587 College St", "neighborhood": "Little Italy", "price_range": "$$"},
        {"name": "The Depanneur", "address": "1033 College St", "neighborhood": "Dufferin Grove", "price_range": "$$"},
    ],
    "trivia_night": [
        {"name": "The Rec Room", "address": "255 Bremner Blvd", "neighborhood": "Entertainment District", "price_range": "$$"},
        {"name": "Storm Crow Manor", "address": "580 Church St", "neighborhood": "Church-Wellesley", "price_range": "$$"},
    ],
    "mini_golf": [
        {"name": "Putt-Putt Bar", "address": "120 Adelaide St W", "neighborhood": "Downtown", "price_range": "$$"},
        {"name": "Putting Edge", "address": "5 Fairview Mall Dr", "neighborhood": "North York", "price_range": "$"},
    ],
    "escape_room": [
        {"name": "Escape Games Toronto", "address": "328 Dundas St W", "neighborhood": "Chinatown", "price_range": "$$"},
        {"name": "Casa Loma Escape Series", "address": "1 Austin Terrace", "neighborhood": "Midtown", "price_range": "$$$"},
    ],
    "art_gallery": [
        {"name": "Art Gallery of Ontario", "address": "317 Dundas St W", "neighborhood": "Chinatown", "price_range": "$$"},
        {"name": "Museum of Contemporary Art", "address": "158 Sterling Rd", "neighborhood": "Junction Triangle", "price_range": "$"},
    ],
    "picnic": [
        {"name": "Trinity Bellwoods Park", "address": "790 Queen St W", "neighborhood": "West Queen West", "price_range": "$"},
        {"name": "High Park", "address": "1873 Bloor St W", "neighborhood": "High Park", "price_range": "$"},
        {"name": "Toronto Islands", "address": "Centre Island", "neighborhood": "Toronto Islands", "price_range": "$"},
    ],
    "museum": [
        {"name": "Royal Ontario Museum", "address": "100 Queens Park", "neighborhood": "University", "price_range": "$$"},
        {"name": "Aga Khan Museum", "address": "77 Wynford Dr", "neighborhood": "Don Mills", "price_range": "$$"},
    ],
}


async def _get_group_or_404(db: AsyncSession, group_id: uuid.UUID) -> DateGroup:
    result = await db.execute(
        select(DateGroup)
        .where(DateGroup.id == group_id)
        .options(selectinload(DateGroup.members).selectinload(GroupMember.user))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


def _check_member_or_admin(group: DateGroup, user: User) -> None:
    if user.is_admin:
        return
    member_ids = {m.user_id for m in group.members}
    if user.id not in member_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group_detail(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await _get_group_or_404(db, group_id)
    _check_member_or_admin(group, current_user)

    # Find the group chat room
    chat_result = await db.execute(
        select(ChatRoom.id).where(ChatRoom.group_id == group_id, ChatRoom.room_type == "group")
    )
    chat_room_id = chat_result.scalar_one_or_none()

    members = [
        GroupMemberDetailResponse(
            user_id=m.user_id,
            profile=PublicProfileResponse.model_validate(m.user),
        )
        for m in group.members
    ]

    return GroupDetailResponse(
        id=group.id,
        activity=group.activity,
        scheduled_date=str(group.scheduled_date),
        scheduled_time=group.scheduled_time,
        venue_name=group.venue_name,
        venue_address=group.venue_address,
        status=group.status,
        members=members,
        chat_room_id=chat_room_id,
    )


@router.get("/{group_id}/icebreakers", response_model=IcebreakersResponse)
async def get_icebreakers(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await _get_group_or_404(db, group_id)
    _check_member_or_admin(group, current_user)

    prompts = random.sample(ICEBREAKER_PROMPTS, 3)
    return IcebreakersResponse(prompts=prompts)


@router.get("/{group_id}/venues", response_model=VenuesResponse)
async def get_venues(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await _get_group_or_404(db, group_id)
    _check_member_or_admin(group, current_user)

    activity = group.activity
    venue_data = VENUE_SUGGESTIONS.get(activity, [])
    venues = [VenueResponse(**v) for v in venue_data]

    return VenuesResponse(activity=activity, venues=venues)


@router.post("/{group_id}/confirm")
async def confirm_group(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm participation in a group date. Female confirmations trigger male notifications."""
    group = await _get_group_or_404(db, group_id)
    _check_member_or_admin(group, current_user)

    # Find this user's membership
    gm_result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    gm = gm_result.scalar_one_or_none()
    if not gm:
        raise HTTPException(status_code=404, detail="Not a member of this group")

    gm.confirmed = True
    await db.flush()

    # If a female just confirmed, check if all females are now confirmed
    if current_user.gender == "female":
        await _check_and_notify_males(group_id, group.activity, db)

    # Check if ALL members are now confirmed → schedule pre-date prompts
    await _check_all_confirmed_and_schedule(group_id, group, db)

    await db.commit()
    return {"message": "Confirmed"}


async def _check_and_notify_males(
    group_id: uuid.UUID, activity: str, db: AsyncSession
) -> None:
    """If all female members confirmed, notify male members."""
    all_members_result = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_id)
        .options(selectinload(GroupMember.user))
    )
    all_members = all_members_result.scalars().all()

    females = [m for m in all_members if m.user.gender == "female"]
    males = [m for m in all_members if m.user.gender == "male"]

    all_females_confirmed = all(f.confirmed for f in females)
    if not all_females_confirmed:
        return

    # Notify males who haven't been notified yet
    now = datetime.utcnow()
    for m in males:
        if not m.notified_at:
            m.notified_at = now
            if m.user.push_token:
                await notify_group_reveal(m.user.push_token, activity, str(group_id))


async def _check_all_confirmed_and_schedule(
    group_id: uuid.UUID, group: DateGroup, db: AsyncSession
) -> None:
    """If all members confirmed, update status and schedule pre-date prompts."""
    all_members_result = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_id)
    )
    all_members = all_members_result.scalars().all()

    if not all(m.confirmed for m in all_members):
        return

    # Mark group as confirmed
    group.status = "confirmed"

    # Find the group chat room
    room_result = await db.execute(
        select(ChatRoom.id).where(
            ChatRoom.group_id == group_id,
            ChatRoom.room_type == "group",
        )
    )
    room_id = room_result.scalar_one_or_none()
    if not room_id:
        return

    await schedule_pre_date_prompts(
        group_id=group_id,
        room_id=room_id,
        scheduled_date=group.scheduled_date,
        scheduled_time=group.scheduled_time,
        db=db,
    )
