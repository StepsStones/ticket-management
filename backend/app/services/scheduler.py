from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, date
import logging
from app.core.database import AsyncSessionLocal
from app.models.models import Ticket, TicketStatus, DailyUpdateStatus, User, UserRole, DailyTicketUpdate, Project
from app.services.notification_service import create_notification, notify_admins, notify_all_active_users

logger = logging.getLogger("scheduler")

scheduler = AsyncIOScheduler()

async def check_unassigned_ticket_reminders():
    """
    Every hour: Checks all tickets that are NOT ASSIGNED to anyone.
    Sends push notification to all users:
    'Unassigned Ticket Alert: Ticket <ID> for <Project> has not been assigned to anyone yet. Please assign an employee.'
    """
    logger.info("Executing hourly unassigned ticket check...")
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(Ticket).options(
                selectinload(Ticket.project)
            ).where(
                Ticket.assigned_to_id.is_(None),
                Ticket.status.notin_([TicketStatus.CLOSED, TicketStatus.CANCELLED])
            )
            result = await db.execute(stmt)
            unassigned_tickets = result.scalars().all()
            
            for ticket in unassigned_tickets:
                proj_name = ticket.project.name if ticket.project else "General / Non-Project"
                notif_title = f"Unassigned Ticket Alert: {ticket.ticket_number}"
                notif_message = (
                    f"Ticket {ticket.ticket_number} for project '{proj_name}' "
                    f"has not been assigned to anyone yet. (Customer: {ticket.customer_name}). "
                    f"Please assign an employee to take action."
                )
                
                # Push notification to all active users
                await notify_all_active_users(
                    db=db,
                    title=notif_title,
                    message=notif_message,
                    notification_type="UNASSIGNED_HOURLY_REMINDER",
                    ticket_id=ticket.id,
                    ticket_number=ticket.ticket_number
                )
                
            logger.info(f"Sent hourly unassigned reminders for {len(unassigned_tickets)} unassigned tickets.")
        except Exception as e:
            logger.error(f"Error checking unassigned ticket reminders: {e}")
            await db.rollback()

async def check_escalation_and_daily_reminders():
    """
    Checks active assigned tickets:
    1. If ticket is not completed yet and has crossed due date or daily reporting window:
       Sends escalation push notification particularly to the assigned person:
       'Ticket <ID> assigned for you is not completed yet. Please update progress immediately.'
    2. Sends escalation alert to Admins.
    """
    logger.info("Executing escalation and daily reminder check...")
    today_str = date.today().isoformat()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    async with AsyncSessionLocal() as db:
        try:
            active_statuses = [
                TicketStatus.ASSIGNED,
                TicketStatus.IN_PROGRESS,
                TicketStatus.WAITING_FOR_CUSTOMER,
                TicketStatus.WAITING_FOR_INTERNAL_TEAM,
                TicketStatus.REOPENED
            ]
            stmt = select(Ticket).options(
                selectinload(Ticket.project),
                selectinload(Ticket.assignee)
            ).where(
                Ticket.status.in_(active_statuses),
                Ticket.assigned_to_id.isnot(None)
            )
            result = await db.execute(stmt)
            tickets = result.scalars().all()
            
            for ticket in tickets:
                proj_name = ticket.project.name if ticket.project else "General"
                assignee_name = ticket.assignee.full_name if ticket.assignee else "Staff"
                
                # 1. Daily update status check
                update_stmt = select(DailyTicketUpdate).where(
                    DailyTicketUpdate.ticket_id == ticket.id,
                    DailyTicketUpdate.update_date == today_str
                )
                up_res = await db.execute(update_stmt)
                has_today_update = up_res.scalar_one_or_none() is not None
                
                if not has_today_update:
                    ticket.daily_update_status = DailyUpdateStatus.PENDING
                    # Personal push notification particularly to the assigned employee
                    if ticket.assigned_to_id:
                        await create_notification(
                            db=db,
                            user_id=ticket.assigned_to_id,
                            title=f"Daily Update Required: {ticket.ticket_number}",
                            message=(
                                f"Ticket {ticket.ticket_number} assigned for you is not completed yet "
                                f"on project '{proj_name}'. Please submit your daily progress report."
                            ),
                            notification_type="DAILY_REMINDER",
                            ticket_id=ticket.id,
                            ticket_number=ticket.ticket_number
                        )
                
                # 2. Overdue escalation check (due date strictly before today)
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                is_overdue = ticket.due_date and (ticket.due_date.replace(tzinfo=timezone.utc) if ticket.due_date.tzinfo is None else ticket.due_date) < today_start
                if is_overdue:
                    ticket.daily_update_status = DailyUpdateStatus.OVERDUE
                    
                    # Direct escalation notification to the assigned employee
                    if ticket.assigned_to_id:
                        await create_notification(
                            db=db,
                            user_id=ticket.assigned_to_id,
                            title=f"⚠️ Escalation: Ticket {ticket.ticket_number} Incomplete",
                            message=(
                                f"Ticket {ticket.ticket_number} assigned for you is not completed yet "
                                f"and has crossed its target resolution due date. (Customer: {ticket.customer_name}). "
                                f"Immediate action and status resolution required."
                            ),
                            notification_type="TICKET_ESCALATION",
                            ticket_id=ticket.id,
                            ticket_number=ticket.ticket_number
                        )
                    
                    # Escalation alert to Admins
                    await notify_admins(
                        db=db,
                        title=f"⚠️ Escalation Alert: {ticket.ticket_number}",
                        message=(
                            f"Ticket {ticket.ticket_number} assigned to {assignee_name} for '{proj_name}' "
                            f"is not completed yet and is overdue. (Customer: {ticket.customer_name})."
                        ),
                        notification_type="MANAGEMENT_ESCALATION",
                        ticket_id=ticket.id,
                        ticket_number=ticket.ticket_number
                    )
            
            await db.commit()
            logger.info(f"Processed {len(tickets)} active tickets for escalation reminders.")
        except Exception as e:
            logger.error(f"Error checking escalation reminders: {e}")
            await db.rollback()

def start_scheduler():
    # 1. Hourly check for unassigned tickets -> alerts all users
    scheduler.add_job(
        check_unassigned_ticket_reminders,
        "interval",
        hours=1,
        id="hourly_unassigned_reminders",
        replace_existing=True
    )
    
    # 2. Regular check for escalations and daily reminders -> alerts assigned employees & admins
    scheduler.add_job(
        check_escalation_and_daily_reminders,
        "interval",
        minutes=30,
        id="escalation_and_daily_reminders",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Background push notification & escalation schedulers active.")

def stop_scheduler():
    scheduler.shutdown(wait=False)
