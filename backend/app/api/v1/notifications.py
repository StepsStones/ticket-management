from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from datetime import datetime, timezone
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import Notification, User
from app.schemas.schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
async def get_my_notifications(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Notification).where(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).offset(skip).limit(limit)
    
    res = await db.execute(query)
    notifications = res.scalars().all()
    
    # Unread count
    unread_res = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    unread_count = unread_res.scalar() or 0
    
    return {
        "notifications": [NotificationResponse.model_validate(n) for n in notifications],
        "unread_count": unread_count
    }

@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    )
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    return {"message": "Notification marked as read"}

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    res = await db.execute(stmt)
    notifs = res.scalars().all()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for n in notifs:
        n.is_read = True
        n.read_at = now
    await db.commit()
    return {"message": f"Marked {len(notifs)} notifications as read"}
