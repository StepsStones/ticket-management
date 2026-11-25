from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
from datetime import datetime, timezone
from app.models.models import Notification, User, UserRole
from app.services.websocket_manager import ws_manager

async def create_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    message: str,
    notification_type: str,
    ticket_id: Optional[str] = None,
    ticket_number: Optional[str] = None
) -> Notification:
    notif = Notification(
        user_id=user_id,
        ticket_id=ticket_id,
        ticket_number=ticket_number,
        type=notification_type,
        title=title,
        message=message,
        is_read=False,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    
    # Broadcast in real-time via WebSocket
    payload = {
        "event": "NOTIFICATION",
        "data": {
            "id": notif.id,
            "user_id": notif.user_id,
            "ticket_id": notif.ticket_id,
            "ticket_number": notif.ticket_number,
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "created_at": notif.created_at.isoformat()
        }
    }
    await ws_manager.send_personal_message(payload, user_id)
    return notif

async def notify_admins(
    db: AsyncSession,
    title: str,
    message: str,
    notification_type: str,
    ticket_id: Optional[str] = None,
    ticket_number: Optional[str] = None
):
    # Find all active Super Admin and Admin users
    stmt = select(User).where(
        User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
        User.is_active == True
    )
    result = await db.execute(stmt)
    admins = result.scalars().all()
    
    for admin in admins:
        await create_notification(
            db=db,
            user_id=admin.id,
            title=title,
            message=message,
            notification_type=notification_type,
            ticket_id=ticket_id,
            ticket_number=ticket_number
        )

async def notify_all_active_users(
    db: AsyncSession,
    title: str,
    message: str,
    notification_type: str,
    ticket_id: Optional[str] = None,
    ticket_number: Optional[str] = None
):
    stmt = select(User).where(User.is_active == True)
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    for u in users:
        await create_notification(
            db=db,
            user_id=u.id,
            title=title,
            message=message,
            notification_type=notification_type,
            ticket_id=ticket_id,
            ticket_number=ticket_number
        )
