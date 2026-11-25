from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    response: Response,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    page: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Immutable audit log viewer for Super Admins and Admins.
    Audit records cannot be edited or deleted via the application.
    """
    if page is not None and page > 0:
        skip = (page - 1) * limit

    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if search:
        s = f"%{search}%"
        query = query.where(
            (AuditLog.user_name.ilike(s)) |
            (AuditLog.entity_id.ilike(s)) |
            (AuditLog.action.ilike(s)) |
            (AuditLog.new_value.ilike(s))
        )
        
    count_stmt = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    total_pages = max(1, (total_count + limit - 1) // limit) if limit > 0 else 1
    current_page = (skip // limit) + 1 if limit > 0 else 1

    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Total-Pages"] = str(total_pages)
    response.headers["X-Current-Page"] = str(current_page)
    response.headers["X-Page-Size"] = str(limit)

    query = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    res = await db.execute(query)
    logs = res.scalars().all()
    return logs
