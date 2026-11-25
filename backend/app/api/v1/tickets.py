import os
import shutil
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Request, Response
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_, and_, desc
from typing import List, Optional
import json

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_admin
from app.models.models import (
    Ticket, TicketStatus, TicketPriority, TicketCategory, User, UserRole, Project,
    TicketAssignment, TicketAttachment, TicketComment, TicketTimeline, TimelineEventType,
    DailyUpdateStatus, TicketFollowup, DailyTicketUpdate
)
from app.schemas.schemas import (
    TicketCreate, TicketUpdate, TicketListItem, TicketDetailResponse, TicketAssignRequest,
    TicketStatusUpdateRequest, TicketResolveRequest, TicketReopenRequest,
    CommentCreate, CommentResponse, AttachmentResponse, TimelineResponse,
    FollowupResponse, DailyUpdateResponse
)
from app.services.notification_service import create_notification, notify_admins, notify_all_active_users
from app.services.scheduler import check_unassigned_ticket_reminders, check_escalation_and_daily_reminders
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/tickets", tags=["Tickets"])

async def generate_ticket_number(db: AsyncSession) -> str:
    year = date.today().year
    prefix = f"SS-TKT-{year}-"
    # Find max existing ticket number for current year
    stmt = select(Ticket.ticket_number).where(Ticket.ticket_number.like(f"{prefix}%")).order_by(Ticket.ticket_number.desc()).limit(1)
    res = await db.execute(stmt)
    last_num = res.scalar_one_or_none()
    
    if last_num:
        try:
            seq = int(last_num.split("-")[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
        
    return f"{prefix}{seq:05d}"

def validate_file(file: UploadFile):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type .{ext}. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

@router.get("/", response_model=List[TicketListItem])
async def list_tickets(
    response: Response,
    view: str = "all",
    project_id: Optional[str] = None,
    category: Optional[TicketCategory] = None,
    priority: Optional[TicketPriority] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    assigned_to_id: Optional[str] = None,
    is_overdue: Optional[bool] = None,
    page: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if page is not None and page > 0:
        skip = (page - 1) * limit

    base_query = select(Ticket)
    
    # 1. View filter
    if view == "unassigned":
        base_query = base_query.where(Ticket.assigned_to_id.is_(None), Ticket.status != TicketStatus.CLOSED, Ticket.status != TicketStatus.CANCELLED)
    elif view == "my_created":
        base_query = base_query.where(Ticket.created_by_id == current_user.id)
    elif view == "my_assigned":
        base_query = base_query.where(Ticket.assigned_to_id == current_user.id)
    elif view == "in_progress":
        base_query = base_query.where(Ticket.status == TicketStatus.IN_PROGRESS)
        if current_user.role == UserRole.EMPLOYEE:
            base_query = base_query.where(or_(Ticket.assigned_to_id == current_user.id, Ticket.created_by_id == current_user.id))
    elif view == "overdue":
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        base_query = base_query.where(
            or_(
                Ticket.daily_update_status == DailyUpdateStatus.OVERDUE,
                and_(
                    Ticket.due_date.isnot(None),
                    Ticket.due_date < today_start,
                    Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED])
                )
            )
        )
        if current_user.role == UserRole.EMPLOYEE:
            base_query = base_query.where(or_(Ticket.assigned_to_id == current_user.id, Ticket.created_by_id == current_user.id))
    elif view == "resolved":
        base_query = base_query.where(Ticket.status == TicketStatus.RESOLVED)
        if current_user.role == UserRole.EMPLOYEE:
            base_query = base_query.where(or_(Ticket.assigned_to_id == current_user.id, Ticket.created_by_id == current_user.id))
    elif view == "closed":
        base_query = base_query.where(Ticket.status == TicketStatus.CLOSED)
        if current_user.role == UserRole.EMPLOYEE:
            base_query = base_query.where(or_(Ticket.assigned_to_id == current_user.id, Ticket.created_by_id == current_user.id))
    elif view == "pending_daily":
        base_query = base_query.where(
            Ticket.daily_update_status == DailyUpdateStatus.PENDING,
            Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED])
        )
        if current_user.role == UserRole.EMPLOYEE:
            base_query = base_query.where(Ticket.assigned_to_id == current_user.id)
    else:  # view == 'all'
        if current_user.role == UserRole.EMPLOYEE:
            # Employee only sees tickets they created or were assigned to
            base_query = base_query.where(or_(Ticket.created_by_id == current_user.id, Ticket.assigned_to_id == current_user.id))

    # 2. Additional filters
    if project_id:
        base_query = base_query.where(Ticket.project_id == project_id)
    if category:
        base_query = base_query.where(Ticket.category == category)
    if priority:
        base_query = base_query.where(Ticket.priority == priority)
    if status:
        base_query = base_query.where(Ticket.status == status)
    if assigned_to_id:
        base_query = base_query.where(Ticket.assigned_to_id == assigned_to_id)
    if is_overdue:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        base_query = base_query.where(
            or_(
                Ticket.daily_update_status == DailyUpdateStatus.OVERDUE,
                and_(
                    Ticket.due_date.isnot(None),
                    Ticket.due_date < today_start,
                    Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED])
                )
            )
        )
        
    # 3. Search query
    if search:
        s = f"%{search}%"
        base_query = base_query.outerjoin(Ticket.project).where(
            or_(
                Ticket.ticket_number.ilike(s),
                Ticket.customer_name.ilike(s),
                Ticket.customer_mobile.ilike(s),
                Ticket.subject.ilike(s),
                Ticket.unit_or_plot_number.ilike(s),
                Project.name.ilike(s)
            )
        )
        
    # 4. Total matching count before pagination
    count_stmt = select(func.count()).select_from(base_query.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    total_pages = max(1, (total_count + limit - 1) // limit) if limit > 0 else 1
    current_page = (skip // limit) + 1 if limit > 0 else 1

    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Total-Pages"] = str(total_pages)
    response.headers["X-Current-Page"] = str(current_page)
    response.headers["X-Page-Size"] = str(limit)

    query = base_query.options(
        selectinload(Ticket.project),
        selectinload(Ticket.creator),
        selectinload(Ticket.assignee),
        selectinload(Ticket.attachments)
    ).order_by(desc(Ticket.created_at)).offset(skip).limit(limit)

    res = await db.execute(query)
    tickets = res.scalars().all()
    
    items = []
    for t in tickets:
        items.append(TicketListItem(
            id=t.id,
            ticket_number=t.ticket_number,
            customer_name=t.customer_name,
            customer_mobile=t.customer_mobile,
            project_name=t.project.name if t.project else "General / Non-Project Related",
            project_code=t.project.code if t.project else "GEN",
            category=t.category,
            priority=t.priority,
            status=t.status,
            created_by_name=t.creator.full_name if t.creator else "Unknown",
            assigned_to_name=t.assignee.full_name if t.assignee else None,
            assigned_to_id=t.assigned_to_id,
            created_at=t.created_at,
            updated_at=t.updated_at,
            due_date=t.due_date,
            daily_update_status=t.daily_update_status,
            attachment_count=len(t.attachments) if t.attachments else 0
        ))
    return items

@router.post("/", response_model=TicketDetailResponse)
async def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ticket_num = await generate_ticket_number(db)
    
    project = None
    if ticket_in.project_id:
        p_res = await db.execute(select(Project).where(Project.id == ticket_in.project_id))
        project = p_res.scalar_one_or_none()

    assignee = None
    if ticket_in.assigned_to_id:
        emp_res = await db.execute(select(User).where(User.id == ticket_in.assigned_to_id, User.is_active == True))
        assignee = emp_res.scalar_one_or_none()

    initial_status = TicketStatus.ASSIGNED if assignee else TicketStatus.OPEN
        
    new_ticket = Ticket(
        ticket_number=ticket_num,
        customer_name=ticket_in.customer_name,
        customer_mobile=ticket_in.customer_mobile,
        customer_email=str(ticket_in.customer_email) if ticket_in.customer_email else None,
        project_id=ticket_in.project_id,
        unit_or_plot_number=ticket_in.unit_or_plot_number,
        category=ticket_in.category,
        subject=ticket_in.subject,
        description=ticket_in.description,
        priority=ticket_in.priority,
        status=initial_status,
        created_by_id=current_user.id,
        assigned_to_id=assignee.id if assignee else None,
        due_date=ticket_in.due_date.replace(tzinfo=None) if ticket_in.due_date else None,
        daily_update_status=DailyUpdateStatus.PENDING
    )
    db.add(new_ticket)
    await db.flush()  # allocate ID
    
    # 1. Timeline event: Ticket Created
    proj_display = project.name if project else "General / Non-Project Related"
    timeline_event = TicketTimeline(
        ticket_id=new_ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=TimelineEventType.CREATED,
        title="Ticket Created",
        description=f"Ticket created by {current_user.full_name} for customer {new_ticket.customer_name} ({proj_display})."
    )
    db.add(timeline_event)

    # If assignee was chosen during creation, record assignment & timeline
    if assignee:
        assignment = TicketAssignment(
            ticket_id=new_ticket.id,
            assigned_by_id=current_user.id,
            assigned_to_id=assignee.id,
            notes="Assigned upon ticket creation"
        )
        db.add(assignment)

        assign_timeline = TicketTimeline(
            ticket_id=new_ticket.id,
            user_id=current_user.id,
            user_name=current_user.full_name,
            event_type=TimelineEventType.ASSIGNED,
            title="Ticket Assigned",
            description=f"Assigned directly to {assignee.full_name} ({assignee.department}) upon creation."
        )
        db.add(assign_timeline)
    
    # 2. Audit log
    await log_audit_event(
        db=db,
        action="TICKET_CREATED",
        entity_type="Ticket",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=new_ticket.ticket_number,
        new_value=f"Subject: {new_ticket.subject}, Priority: {new_ticket.priority.value}, Category: {new_ticket.category.value}"
    )
    
    await db.commit()
    
    # 3. Notify all users / Admins about the new ticket creation
    proj_display = project.name if project else "General / Non-Project"
    notif_msg = f"{current_user.full_name} created {new_ticket.ticket_number} for {proj_display} (Customer: {new_ticket.customer_name} - {new_ticket.category.value})"
    await notify_all_active_users(
        db=db,
        title=f"New Ticket: {new_ticket.ticket_number}",
        message=notif_msg,
        notification_type="TICKET_CREATED",
        ticket_id=new_ticket.id,
        ticket_number=new_ticket.ticket_number
    )

    # 4. If assigned upon creation, send direct notification to assignee
    if assignee:
        await create_notification(
            db=db,
            user_id=assignee.id,
            title=f"New Assignment: {new_ticket.ticket_number}",
            message=f"{current_user.full_name} assigned ticket {new_ticket.ticket_number} ({new_ticket.customer_name}) to you.",
            notification_type="TICKET_ASSIGNED",
            ticket_id=new_ticket.id,
            ticket_number=new_ticket.ticket_number
        )
    
    return await get_ticket_detail_internal(new_ticket.id, db)

async def get_ticket_detail_internal(ticket_id: str, db: AsyncSession) -> TicketDetailResponse:
    stmt = select(Ticket).options(
        selectinload(Ticket.project),
        selectinload(Ticket.creator),
        selectinload(Ticket.assignee),
        selectinload(Ticket.resolved_by),
        selectinload(Ticket.closed_by),
        selectinload(Ticket.attachments).selectinload(TicketAttachment.uploaded_by),
        selectinload(Ticket.comments).selectinload(TicketComment.author),
        selectinload(Ticket.followups).selectinload(TicketFollowup.author),
        selectinload(Ticket.daily_updates).selectinload(DailyTicketUpdate.author),
        selectinload(Ticket.timeline_events)
    ).where(Ticket.id == ticket_id)
    
    res = await db.execute(stmt)
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    return TicketDetailResponse(
        id=t.id,
        ticket_number=t.ticket_number,
        customer_name=t.customer_name,
        customer_mobile=t.customer_mobile,
        customer_email=t.customer_email,
        project_id=t.project_id,
        project_name=t.project.name if t.project else "General / Non-Project Related",
        project_code=t.project.code if t.project else "GEN",
        unit_or_plot_number=t.unit_or_plot_number,
        category=t.category,
        subject=t.subject,
        description=t.description,
        priority=t.priority,
        status=t.status,
        created_by_id=t.created_by_id,
        created_by_name=t.creator.full_name if t.creator else "Unknown",
        assigned_to_id=t.assigned_to_id,
        assigned_to_name=t.assignee.full_name if t.assignee else None,
        due_date=t.due_date,
        resolution_notes=t.resolution_notes,
        resolved_by_id=t.resolved_by_id,
        resolved_by_name=t.resolved_by.full_name if t.resolved_by else None,
        resolved_at=t.resolved_at,
        closed_by_id=t.closed_by_id,
        closed_by_name=t.closed_by.full_name if t.closed_by else None,
        closed_at=t.closed_at,
        reopened_reason=t.reopened_reason,
        requires_daily_update=t.requires_daily_update,
        daily_update_status=t.daily_update_status,
        last_daily_update_at=t.last_daily_update_at,
        created_at=t.created_at,
        updated_at=t.updated_at,
        attachments=[
            AttachmentResponse(
                id=a.id,
                ticket_id=a.ticket_id,
                file_name=a.file_name,
                original_file_name=a.original_file_name,
                file_type=a.file_type,
                file_size=a.file_size,
                file_path=f"/api/v1/tickets/{t.id}/attachments/{a.id}/download",
                uploaded_by_id=a.uploaded_by_id,
                uploaded_by_name=a.uploaded_by.full_name if a.uploaded_by else "Staff",
                created_at=a.created_at
            ) for a in t.attachments
        ],
        comments=[
            CommentResponse(
                id=c.id,
                ticket_id=c.ticket_id,
                user_id=c.user_id,
                user_name=c.author.full_name if c.author else "Staff",
                comment_text=c.comment_text,
                is_internal=c.is_internal,
                created_at=c.created_at
            ) for c in t.comments
        ],
        followups=[
            FollowupResponse.model_validate(f) for f in t.followups
        ],
        daily_updates=[
            DailyUpdateResponse.model_validate(d) for d in t.daily_updates
        ],
        timeline=[
            TimelineResponse.model_validate(tm) for tm in t.timeline_events
        ]
    )

@router.get("/{ticket_id}", response_model=TicketDetailResponse)
async def get_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ticket_resp = await get_ticket_detail_internal(ticket_id, db)
    # Check permissions for employee
    if current_user.role == UserRole.EMPLOYEE:
        if ticket_resp.created_by_id != current_user.id and ticket_resp.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have permission to view this ticket")
            
    return ticket_resp

@router.patch("/{ticket_id}", response_model=TicketDetailResponse)
async def update_ticket(
    ticket_id: str,
    ticket_in: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Ticket).options(
        selectinload(Ticket.project)
    ).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if current_user.role == UserRole.EMPLOYEE and ticket.created_by_id != current_user.id and ticket.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied to edit this ticket")
        
    diffs = []
    if ticket_in.customer_name is not None and ticket_in.customer_name.strip() and ticket_in.customer_name.strip() != ticket.customer_name:
        diffs.append(f"Customer Name: '{ticket.customer_name}' -> '{ticket_in.customer_name.strip()}'")
        ticket.customer_name = ticket_in.customer_name.strip()
        
    if ticket_in.customer_mobile is not None and ticket_in.customer_mobile.strip() and ticket_in.customer_mobile.strip() != ticket.customer_mobile:
        diffs.append(f"Mobile: '{ticket.customer_mobile}' -> '{ticket_in.customer_mobile.strip()}'")
        ticket.customer_mobile = ticket_in.customer_mobile.strip()
        
    if ticket_in.customer_email is not None:
        new_email = str(ticket_in.customer_email).strip() if ticket_in.customer_email else None
        if new_email != ticket.customer_email:
            diffs.append(f"Email: '{ticket.customer_email or ''}' -> '{new_email or ''}'")
            ticket.customer_email = new_email
            
    if ticket_in.project_id is not None and ticket_in.project_id != ticket.project_id:
        old_proj_name = ticket.project.name if ticket.project else "General"
        new_proj_name = "General"
        if ticket_in.project_id:
            p_res = await db.execute(select(Project).where(Project.id == ticket_in.project_id))
            new_p = p_res.scalar_one_or_none()
            if new_p:
                new_proj_name = new_p.name
        diffs.append(f"Project: '{old_proj_name}' -> '{new_proj_name}'")
        ticket.project_id = ticket_in.project_id if ticket_in.project_id else None
        
    if ticket_in.unit_or_plot_number is not None and ticket_in.unit_or_plot_number != ticket.unit_or_plot_number:
        diffs.append(f"Unit/Plot: '{ticket.unit_or_plot_number or ''}' -> '{ticket_in.unit_or_plot_number or ''}'")
        ticket.unit_or_plot_number = ticket_in.unit_or_plot_number
        
    if ticket_in.category is not None and ticket_in.category != ticket.category:
        diffs.append(f"Category: '{ticket.category.value}' -> '{ticket_in.category.value}'")
        ticket.category = ticket_in.category
        
    if ticket_in.priority is not None and ticket_in.priority != ticket.priority:
        diffs.append(f"Priority: '{ticket.priority.value}' -> '{ticket_in.priority.value}'")
        ticket.priority = ticket_in.priority
        
    if ticket_in.subject is not None and ticket_in.subject.strip() and ticket_in.subject.strip() != ticket.subject:
        diffs.append(f"Subject: '{ticket.subject}' -> '{ticket_in.subject.strip()}'")
        ticket.subject = ticket_in.subject.strip()
        
    if ticket_in.description is not None and ticket_in.description.strip() and ticket_in.description.strip() != ticket.description:
        diffs.append("Description updated")
        ticket.description = ticket_in.description.strip()
        
    if ticket_in.due_date is not None:
        new_due = ticket_in.due_date.replace(tzinfo=None)
        if new_due != ticket.due_date:
            old_due_str = ticket.due_date.strftime('%Y-%m-%d') if ticket.due_date else 'None'
            new_due_str = new_due.strftime('%Y-%m-%d')
            diffs.append(f"Target Due Date: '{old_due_str}' -> '{new_due_str}'")
            ticket.due_date = new_due

    if diffs:
        diff_str = "; ".join(diffs)
        ticket.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # 1. Timeline event
        timeline_event = TicketTimeline(
            ticket_id=ticket.id,
            user_id=current_user.id,
            user_name=current_user.full_name,
            event_type=TimelineEventType.STATUS_CHANGED,
            title="Ticket Details Edited",
            description=f"Edited by {current_user.full_name}: {diff_str}"
        )
        db.add(timeline_event)
        
        # 2. Immutable Audit Log
        await log_audit_event(
            db=db,
            action="TICKET_EDITED",
            entity_type="Ticket",
            user_id=current_user.id,
            user_name=current_user.full_name,
            entity_id=ticket.ticket_number,
            previous_value=None,
            new_value=diff_str
        )
        
        await db.commit()

    return await get_ticket_detail_internal(ticket.id, db)

@router.post("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    assign_in: TicketAssignRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Ticket).options(
        selectinload(Ticket.project),
        selectinload(Ticket.assignee)
    ).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    emp_res = await db.execute(select(User).where(User.id == assign_in.assigned_to_id, User.is_active == True))
    employee = emp_res.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=400, detail="Selected employee is invalid or inactive")
        
    is_reassignment = ticket.assigned_to_id is not None
    previous_assignee = ticket.assignee.full_name if ticket.assignee else "Unassigned"
    
    ticket.assigned_to_id = employee.id
    if ticket.status == TicketStatus.OPEN:
        ticket.status = TicketStatus.ASSIGNED
        
    # Assignment record
    assignment = TicketAssignment(
        ticket_id=ticket.id,
        assigned_by_id=current_user.id,
        assigned_to_id=employee.id,
        notes=assign_in.notes
    )
    db.add(assignment)
    
    # Timeline event
    event_type = TimelineEventType.REASSIGNED if is_reassignment else TimelineEventType.ASSIGNED
    event_title = "Ticket Reassigned" if is_reassignment else "Ticket Assigned"
    event_desc = (
        f"Reassigned from {previous_assignee} to {employee.full_name} by {current_user.full_name}."
        if is_reassignment else
        f"Assigned to {employee.full_name} by {current_user.full_name}."
    )
    if assign_in.notes:
        event_desc += f" Note: {assign_in.notes}"
        
    timeline_event = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=event_type,
        title=event_title,
        description=event_desc
    )
    db.add(timeline_event)
    
    # Audit log
    await log_audit_event(
        db=db,
        action="TICKET_REASSIGNED" if is_reassignment else "TICKET_ASSIGNED",
        entity_type="Ticket",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=ticket.ticket_number,
        previous_value=previous_assignee,
        new_value=employee.full_name
    )
    
    await db.commit()
    
    # Send direct push notification particularly to the assigned employee
    proj_name = ticket.project.name if ticket.project else "General"
    notif_msg = (
        f"{current_user.full_name} assigned you for ticket {ticket.ticket_number} "
        f"({ticket.category.value}) on project '{proj_name}'. "
        f"Customer: {ticket.customer_name}. Please review and take necessary action."
    )
    await create_notification(
        db=db,
        user_id=employee.id,
        title=f"Ticket Assigned: {ticket.ticket_number}",
        message=notif_msg,
        notification_type="TICKET_ASSIGNED",
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number
    )
    
    return {"message": f"Ticket successfully assigned to {employee.full_name}"}

@router.patch("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    status_in: TicketStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if current_user.role == UserRole.EMPLOYEE and ticket.assigned_to_id != current_user.id and ticket.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    old_status = ticket.status
    ticket.status = status_in.status
    
    # Timeline
    desc_str = f"Status changed from {old_status.value} to {ticket.status.value} by {current_user.full_name}."
    if status_in.notes:
        desc_str += f" Remarks: {status_in.notes}"
        
    tl = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=TimelineEventType.STATUS_CHANGED,
        title=f"Status Changed: {ticket.status.value}",
        description=desc_str
    )
    db.add(tl)
    
    # Audit log
    await log_audit_event(
        db=db,
        action="STATUS_CHANGED",
        entity_type="Ticket",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=ticket.ticket_number,
        previous_value=old_status.value,
        new_value=ticket.status.value
    )
    
    await db.commit()
    return {"message": f"Status updated to {ticket.status.value}"}

@router.post("/{ticket_id}/resolve")
async def resolve_ticket(
    ticket_id: str,
    resolve_in: TicketResolveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if current_user.role == UserRole.EMPLOYEE and ticket.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned employee or administrators can resolve this ticket")
        
    ticket.status = TicketStatus.RESOLVED
    ticket.resolution_notes = resolve_in.resolution_notes
    ticket.resolved_by_id = current_user.id
    ticket.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    ticket.daily_update_status = DailyUpdateStatus.SUBMITTED
    
    # Timeline
    tl = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=TimelineEventType.RESOLUTION_SUBMITTED,
        title="Resolution Submitted",
        description=f"Ticket marked as RESOLVED by {current_user.full_name}. Resolution: {resolve_in.resolution_notes}"
    )
    db.add(tl)
    
    # Audit
    await log_audit_event(
        db=db,
        action="TICKET_RESOLVED",
        entity_type="Ticket",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=ticket.ticket_number,
        new_value=resolve_in.resolution_notes
    )
    
    await db.commit()
    
    # Notify creator and Admin
    if ticket.created_by_id != current_user.id:
        await create_notification(
            db=db,
            user_id=ticket.created_by_id,
            title=f"Ticket Resolved: {ticket.ticket_number}",
            message=f"Ticket {ticket.ticket_number} for customer {ticket.customer_name} has been resolved by {current_user.full_name}.",
            notification_type="TICKET_RESOLVED",
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number
        )
    await notify_admins(
        db=db,
        title=f"Ticket Resolved: {ticket.ticket_number}",
        message=f"Ticket {ticket.ticket_number} was resolved by {current_user.full_name} and is awaiting review/closure.",
        notification_type="TICKET_RESOLVED",
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number
    )
    
    return {"message": "Ticket resolved successfully"}

@router.post("/{ticket_id}/close")
async def close_ticket(
    ticket_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket.status = TicketStatus.CLOSED
    ticket.closed_by_id = current_user.id
    ticket.closed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    ticket.requires_daily_update = False
    
    # Timeline
    tl = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=TimelineEventType.CLOSED,
        title="Ticket Closed",
        description=f"Ticket officially closed by {current_user.full_name}."
    )
    db.add(tl)
    
    await log_audit_event(
        db=db,
        action="TICKET_CLOSED",
        entity_type="Ticket",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=ticket.ticket_number
    )
    
    await db.commit()
    
    if ticket.assigned_to_id:
        await create_notification(
            db=db,
            user_id=ticket.assigned_to_id,
            title=f"Ticket Closed: {ticket.ticket_number}",
            message=f"Ticket {ticket.ticket_number} has been officially closed by Admin {current_user.full_name}.",
            notification_type="TICKET_CLOSED",
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number
        )
        
    return {"message": "Ticket officially closed"}

@router.post("/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: str,
    reopen_in: TicketReopenRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket.status = TicketStatus.REOPENED
    ticket.reopened_reason = reopen_in.reopened_reason
    ticket.requires_daily_update = True
    ticket.daily_update_status = DailyUpdateStatus.PENDING
    
    # Timeline
    tl = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=TimelineEventType.REOPENED,
        title="Ticket Reopened",
        description=f"Ticket reopened by {current_user.full_name}. Reason: {reopen_in.reopened_reason}"
    )
    db.add(tl)
    
    await log_audit_event(
        db=db,
        action="TICKET_REOPENED",
        entity_type="Ticket",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=ticket.ticket_number,
        new_value=reopen_in.reopened_reason
    )
    
    await db.commit()
    
    if ticket.assigned_to_id:
        await create_notification(
            db=db,
            user_id=ticket.assigned_to_id,
            title=f"Ticket Reopened: {ticket.ticket_number}",
            message=f"Ticket {ticket.ticket_number} was reopened: {reopen_in.reopened_reason}",
            notification_type="TICKET_REOPENED",
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number
        )
        
    return {"message": "Ticket reopened successfully"}

@router.post("/{ticket_id}/attachments")
async def upload_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    validate_file(file)
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Read file contents and size
    contents = await file.read()
    file_size = len(contents)
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB}MB")
        
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    safe_filename = f"{ticket.ticket_number}_{int(datetime.now().timestamp())}_{file.filename}"
    file_dest = os.path.join(settings.UPLOAD_DIR, safe_filename)
    
    with open(file_dest, "wb") as f:
        f.write(contents)
        
    attachment = TicketAttachment(
        ticket_id=ticket.id,
        file_name=safe_filename,
        original_file_name=file.filename,
        file_type=file.content_type or f"application/{ext}",
        file_size=file_size,
        file_path=file_dest,
        uploaded_by_id=current_user.id
    )
    db.add(attachment)
    
    # Timeline
    tl = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=TimelineEventType.DOCUMENT_UPLOADED,
        title="Document Uploaded",
        description=f"File '{file.filename}' ({round(file_size/1024, 1)} KB) uploaded by {current_user.full_name}."
    )
    db.add(tl)
    
    await log_audit_event(
        db=db,
        action="DOCUMENT_UPLOADED",
        entity_type="TicketAttachment",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=ticket.ticket_number,
        new_value=file.filename
    )
    
    await db.commit()
    await db.refresh(attachment)
    
    return {
        "message": "File uploaded successfully",
        "attachment_id": attachment.id,
        "filename": file.filename
    }

@router.get("/{ticket_id}/attachments/{attachment_id}/download")
async def download_attachment(
    ticket_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TicketAttachment).where(
        TicketAttachment.id == attachment_id,
        TicketAttachment.ticket_id == ticket_id
    )
    res = await db.execute(stmt)
    att = res.scalar_one_or_none()
    if not att or not os.path.exists(att.file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    await log_audit_event(
        db=db,
        action="DOCUMENT_DOWNLOADED",
        entity_type="TicketAttachment",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=att.ticket_id,
        new_value=att.original_file_name
    )
    await db.commit()
    
    return FileResponse(
        path=att.file_path,
        filename=att.original_file_name,
        media_type=att.file_type
    )

@router.post("/{ticket_id}/comments", response_model=CommentResponse)
async def add_comment(
    ticket_id: str,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        comment_text=comment_in.comment_text,
        is_internal=comment_in.is_internal
    )
    db.add(comment)
    
    # Timeline
    tl = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        event_type=TimelineEventType.COMMENT_ADDED,
        title="Comment Added",
        description=f"{current_user.full_name}: {comment_in.comment_text[:200]}"
    )
    db.add(tl)
    
    await db.commit()
    await db.refresh(comment)
    
    # Notify ticket participants
    target_users = set()
    if ticket.assigned_to_id and ticket.assigned_to_id != current_user.id:
        target_users.add(ticket.assigned_to_id)
    if ticket.created_by_id and ticket.created_by_id != current_user.id:
        target_users.add(ticket.created_by_id)
        
    for uid in target_users:
        await create_notification(
            db=db,
            user_id=uid,
            title=f"New Comment on {ticket.ticket_number}",
            message=f"{current_user.full_name} added a comment: {comment_in.comment_text[:100]}",
            notification_type="NEW_COMMENT",
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number
        )
        
    return CommentResponse(
        id=comment.id,
        ticket_id=comment.ticket_id,
        user_id=comment.user_id,
        user_name=current_user.full_name,
        comment_text=comment.comment_text,
        is_internal=comment.is_internal,
        created_at=comment.created_at
    )

@router.post("/trigger-push-notifications")
async def trigger_notifications_manually(current_user: User = Depends(require_admin)):
    """
    Triggers:
    1. Hourly unassigned ticket push notification alert for all users
    2. Incomplete / Overdue escalation push notifications particularly to assigned employees
    """
    await check_unassigned_ticket_reminders()
    await check_escalation_and_daily_reminders()
    return {"message": "Push notifications and escalations processed successfully"}
