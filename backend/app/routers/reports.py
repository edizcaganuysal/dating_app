import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_admin_user, get_current_user
from app.models.report import Report
from app.models.user import User
from app.schemas.report import NoshowUserResponse, ReportCreate, ReportResponse, ReportUpdate
from app.services.noshow_service import check_noshows

router = APIRouter(tags=["reports"])


@router.post("/api/reports", status_code=status.HTTP_201_CREATED, response_model=ReportResponse)
async def create_report(
    body: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify reported user exists
    result = await db.execute(select(User).where(User.id == body.reported_user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reported user not found",
        )

    report = Report(
        reporter_id=current_user.id,
        reported_id=body.reported_user_id,
        group_id=body.group_id,
        category=body.category,
        description=body.description,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/api/admin/reports", response_model=list[ReportResponse])
async def admin_list_reports(
    report_status: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Report)
    if report_status:
        query = query.where(Report.status == report_status)
    query = query.order_by(Report.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/api/admin/reports/{report_id}", response_model=ReportResponse)
async def admin_get_report(
    report_id: uuid.UUID,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    return report


@router.patch("/api/admin/reports/{report_id}", response_model=ReportResponse)
async def admin_update_report(
    report_id: uuid.UUID,
    body: ReportUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    report.status = body.status
    if body.admin_notes is not None:
        report.admin_notes = body.admin_notes
    await db.commit()
    await db.refresh(report)
    return report


@router.post("/api/admin/noshow-check", response_model=list[NoshowUserResponse])
async def admin_noshow_check(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    flagged = await check_noshows(db)
    return flagged
