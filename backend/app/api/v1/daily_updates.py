from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone, date
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import Ticket, DailyTicketUpdate, User, TicketTimeline, TimelineEventType, DailyUpdateStatus
from app.schemas.schemas import DailyUpdateCreate, DailyUpdateResponse
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/tickets/{ticket_id}/daily-updates", tags=["Daily Updates"])

@router.post("/", response_model=DailyUpdateResponse)
async def submit_daily_update(
    ticket_id: str,
    update_in: DailyUpdateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    today_str = date.today().isoformat()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    daily_update = DailyTicketUpdate(
        ticket_id=ticket.id,
        user_id=current_user.id,
        update_date=today_str,
        current_progress=update_in.current_progress,
        delay_reason=update_in.delay_reason,
        pending_dependencies=update_in.pending_dependencies,
        expected_resolution_date=update_in.expected_resolution_date,
        next_followup_date=update_in.next_followup_date
    )
    db.add(daily_update)
    
    # Update ticket status
    ticket.daily_update_status = DailyUpdateStatus.SUBMITTED
    ticket.last_daily_update_at = now
    
    # Timeline
    timeline_desc = f"Progress: {update_in.current_progress}"
    if update_in.delay_reason:
        timeline_desc += f" | Delay Reason: {update_in.delay_reason}"
    if update_in.expected_resolution_date:
        timeline_desc += f" | Target: {update_in.expected_resolution_date}"
        
    tl = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=TimelineEventType.DAILY_UPDATE_SUBMITTED,
        title="Daily Ticket Update Submitted",
        description=timeline_desc
    )
    db.add(tl)
    
    await log_audit_event(
        db=db,
        action="DAILY_UPDATE_SUBMITTED",
        entity_type="DailyTicketUpdate",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=ticket.ticket_number,
        new_value=f"Progress: {update_in.current_progress[:100]}"
    )
    
    await db.commit()
    await db.refresh(daily_update)
    
    return DailyUpdateResponse(
        id=daily_update.id,
        ticket_id=daily_update.ticket_id,
        user_id=daily_update.user_id,
        user_name=current_user.full_name,
        update_date=daily_update.update_date,
        current_progress=daily_update.current_progress,
        delay_reason=daily_update.delay_reason,
        pending_dependencies=daily_update.pending_dependencies,
        expected_resolution_date=daily_update.expected_resolution_date,
        next_followup_date=daily_update.next_followup_date,
        created_at=daily_update.created_at
    )
