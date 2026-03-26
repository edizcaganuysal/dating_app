import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import admin, auth, chat, date_requests, feedback, friends, groups, matches, matching, profiles, reports, second_dates, soft_matches, waitlist

logger = logging.getLogger(__name__)

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


# ── Background Matching Cron ──

async def batch_formation_cron():
    """Every 15 minutes: form batches from pending requests."""
    await asyncio.sleep(10)  # Wait for app startup
    while True:
        try:
            from app.database import async_session
            from app.services.batch_formation import form_batches

            async with async_session() as db:
                batches = await form_batches(db)
                if batches:
                    logger.info(f"Batch formation cron: created {len(batches)} batches")
        except Exception as e:
            logger.error(f"Batch formation cron error: {e}")

        await asyncio.sleep(900)  # 15 minutes


async def matching_cron():
    """Every 15 minutes (offset 7 min): process ready batches."""
    await asyncio.sleep(430)  # 7 min offset from batch formation
    while True:
        try:
            from app.database import async_session
            from app.models.matching_batch import MatchingBatch
            from app.services.ai_matching import run_matching_for_batch
            from sqlalchemy import select

            async with async_session() as db:
                # Find batches that need processing
                result = await db.execute(
                    select(MatchingBatch).where(MatchingBatch.status == "pending")
                )
                batches = result.scalars().all()
                now = datetime.utcnow()

                for batch in batches:
                    age = now - batch.created_at
                    is_full = batch.user_count >= 80
                    is_2h_old = age >= timedelta(hours=2)
                    is_6h_old = age >= timedelta(hours=6)

                    if is_full:
                        # Full batch: match immediately
                        logger.info(f"Processing full batch {batch.id} ({batch.user_count} users)")
                        await run_matching_for_batch(batch, db, force=False)
                    elif is_6h_old:
                        # 6 hour deadline: force match
                        logger.info(f"Force matching 6h-old batch {batch.id}")
                        await run_matching_for_batch(batch, db, force=True)
                    elif is_2h_old and batch.user_count >= 8:
                        # 2 hour check: try match, quality gate applies
                        logger.info(f"Trying 2h batch {batch.id} ({batch.user_count} users)")
                        await run_matching_for_batch(batch, db, force=False)

        except Exception as e:
            logger.error(f"Matching cron error: {e}")

        await asyncio.sleep(900)  # 15 minutes


async def pre_date_prompt_cron():
    """Every 5 minutes: send any due pre-date prompts as system messages."""
    await asyncio.sleep(30)
    while True:
        try:
            from app.database import async_session
            from app.services.pre_date_prompt_service import send_due_prompts

            async with async_session() as db:
                count = await send_due_prompts(db)
                if count:
                    logger.info(f"Pre-date prompt cron: sent {count} prompts")
        except Exception as e:
            logger.error(f"Pre-date prompt cron error: {e}")

        await asyncio.sleep(300)  # 5 minutes


async def female_confirm_timeout_cron():
    """Every 30 minutes: notify males in groups where females haven't confirmed within 12 hours."""
    await asyncio.sleep(60)
    while True:
        try:
            from app.database import async_session
            from app.models.group import GroupMember
            from app.models.user import User
            from app.services.notification_service import notify_group_reveal
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            cutoff = datetime.utcnow() - timedelta(hours=12)

            async with async_session() as db:
                # Find female members notified >12h ago who haven't confirmed
                stale_result = await db.execute(
                    select(GroupMember)
                    .join(User, GroupMember.user_id == User.id)
                    .where(
                        User.gender == "female",
                        GroupMember.notified_at != None,  # noqa: E711
                        GroupMember.notified_at < cutoff,
                        GroupMember.confirmed == False,  # noqa: E712
                    )
                )
                stale_females = stale_result.scalars().all()
                timed_out_group_ids = {gm.group_id for gm in stale_females}

                for group_id in timed_out_group_ids:
                    # Get group activity
                    from app.models.group import DateGroup
                    grp_result = await db.execute(
                        select(DateGroup).where(DateGroup.id == group_id)
                    )
                    grp = grp_result.scalar_one_or_none()
                    if not grp:
                        continue

                    # Notify un-notified males
                    males_result = await db.execute(
                        select(GroupMember)
                        .join(User, GroupMember.user_id == User.id)
                        .where(
                            GroupMember.group_id == group_id,
                            User.gender == "male",
                            GroupMember.notified_at == None,  # noqa: E711
                        )
                        .options(selectinload(GroupMember.user))
                    )
                    males = males_result.scalars().all()
                    now = datetime.utcnow()
                    for m in males:
                        m.notified_at = now
                        if m.user.push_token:
                            await notify_group_reveal(m.user.push_token, grp.activity, str(group_id))

                if timed_out_group_ids:
                    await db.commit()
                    logger.info(f"Female confirm timeout: notified males in {len(timed_out_group_ids)} groups")

        except Exception as e:
            logger.error(f"Female confirm timeout cron error: {e}")

        await asyncio.sleep(1800)  # 30 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background matching cron tasks."""

    batch_task = asyncio.create_task(batch_formation_cron())
    match_task = asyncio.create_task(matching_cron())
    confirm_task = asyncio.create_task(female_confirm_timeout_cron())
    prompt_task = asyncio.create_task(pre_date_prompt_cron())
    logger.info("Started matching cron tasks")
    yield
    batch_task.cancel()
    match_task.cancel()
    confirm_task.cancel()
    prompt_task.cancel()


# ── App Setup ──

app = FastAPI(title="Yuni API", lifespan=lifespan)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(date_requests.router)
app.include_router(matching.router)
app.include_router(groups.router)
app.include_router(feedback.router)
app.include_router(soft_matches.router)
app.include_router(matches.router)
app.include_router(chat.router)
app.include_router(reports.router)
app.include_router(friends.router)
app.include_router(waitlist.router)
app.include_router(second_dates.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
