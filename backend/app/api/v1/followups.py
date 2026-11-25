from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import Ticket, TicketFollowup, User, TicketTimeline, TimelineEventType, UserRole
from app.schemas.schemas import FollowupCreate, FollowupResponse
from app.services.notification_service import create_notification
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/tickets/{ticket_id}/followups", tags=["Follow-ups"])

@router.post("/", response_model=FollowupResponse)
async def create_followup(
    ticket_id: str,
    followup_in: FollowupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    followup = TicketFollowup(
        ticket_id=ticket.id,
        user_id=current_user.id,
        followup_type=followup_in.followup_type,
        description=followup_in.description,
        followup_date=followup_in.followup_date,
        followup_time=followup_in.followup_time,
        next_followup_date=followup_in.next_followup_date,
        internal_remarks=followup_in.internal_remarks
    )
    db.add(followup)
    
    # Timeline
    desc_str = f"[{followup_in.followup_type.value}] {followup_in.description}"
    if followup_in.next_followup_date:
        desc_str += f" | Next follow-up: {followup_in.next_followup_date}"
        
    tl = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=TimelineEventType.FOLLOWUP_COMPLETED,
        title="Follow-up Update Submitted",
        description=desc_str
    )
    db.add(tl)
    
    await log_audit_event(
        db=db,
        action="FOLLOWUP_ADDED",
        entity_type="TicketFollowup",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=ticket.ticket_number,
        new_value=f"Type: {followup_in.followup_type.value}"
    )
    
    await db.commit()
    await db.refresh(followup)
    
    # Notify ticket participants
    if ticket.created_by_id != current_user.id:
        await create_notification(
            db=db,
            user_id=ticket.created_by_id,
            title=f"Follow-up on {ticket.ticket_number}",
            message=f"{current_user.full_name} added a follow-up: {followup_in.followup_type.value}",
            notification_type="FOLLOWUP_ADDED",
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number
        )
        
    return FollowupResponse(
        id=followup.id,
        ticket_id=followup.ticket_id,
        user_id=followup.user_id,
        user_name=current_user.full_name,
        followup_type=followup.followup_type,
        description=followup.description,
        followup_date=followup.followup_date,
        followup_time=followup.followup_time,
        next_followup_date=followup.next_followup_date,
        internal_remarks=followup.internal_remarks,
        created_at=followup.created_at
    )
