from fastapi import APIRouter, Depends, Response, Request, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, or_, and_
from datetime import datetime, timezone
from typing import Optional
import csv
import io
from app.core.database import get_db
from app.core.security import decode_token
from app.core.dependencies import get_current_user
from app.models.models import (
    Ticket, TicketStatus, TicketPriority, TicketCategory, DailyUpdateStatus, Project, User, UserRole
)
from app.schemas.schemas import DashboardStats, DashboardCharts, ChartDataPoint

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/dashboard")
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    
    # Base ticket query filter for employee vs admin
    user_filter = None
    if current_user.role == UserRole.EMPLOYEE:
        user_filter = or_(Ticket.created_by_id == current_user.id, Ticket.assigned_to_id == current_user.id)
    
    # 1. Total counts
    tickets_stmt = select(Ticket)
    if user_filter is not None:
        tickets_stmt = tickets_stmt.where(user_filter)
    all_tickets = (await db.execute(tickets_stmt)).scalars().all()
    
    total = len(all_tickets)
    new_t = sum(1 for t in all_tickets if t.status == TicketStatus.OPEN)
    unassigned_t = sum(1 for t in all_tickets if t.assigned_to_id is None and t.status not in [TicketStatus.CLOSED, TicketStatus.CANCELLED])
    assigned_t = sum(1 for t in all_tickets if t.assigned_to_id is not None and t.status == TicketStatus.ASSIGNED)
    in_prog = sum(1 for t in all_tickets if t.status == TicketStatus.IN_PROGRESS)
    waiting_cust = sum(1 for t in all_tickets if t.status == TicketStatus.WAITING_FOR_CUSTOMER)
    waiting_int = sum(1 for t in all_tickets if t.status == TicketStatus.WAITING_FOR_INTERNAL_TEAM)
    resolved_t = sum(1 for t in all_tickets if t.status == TicketStatus.RESOLVED)
    closed_t = sum(1 for t in all_tickets if t.status == TicketStatus.CLOSED)
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    overdue_t = sum(1 for t in all_tickets if (
        t.daily_update_status == DailyUpdateStatus.OVERDUE or 
        (t.due_date and (t.due_date.replace(tzinfo=None) if t.due_date.tzinfo else t.due_date) < today_start and t.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED])
    ))
    
    pending_daily = sum(1 for t in all_tickets if (
        t.daily_update_status == DailyUpdateStatus.PENDING and 
        t.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED]
    ))
    
    stats = DashboardStats(
        total_tickets=total,
        new_tickets=new_t,
        unassigned_tickets=unassigned_t,
        assigned_tickets=assigned_t,
        in_progress=in_prog,
        waiting_customer=waiting_cust,
        waiting_internal=waiting_int,
        overdue_tickets=overdue_t,
        resolved_tickets=resolved_t,
        closed_tickets=closed_t,
        pending_daily_updates=pending_daily
    )
    
    # 2. Charts
    # By Status
    status_counts = {}
    for t in all_tickets:
        s_val = t.status.value
        status_counts[s_val] = status_counts.get(s_val, 0) + 1
    by_status = [ChartDataPoint(label=k, value=v) for k, v in status_counts.items()]
    
    # By Priority
    priority_counts = {}
    for t in all_tickets:
        p_val = t.priority.value
        priority_counts[p_val] = priority_counts.get(p_val, 0) + 1
    by_priority = [ChartDataPoint(label=k, value=v) for k, v in priority_counts.items()]
    
    # By Category
    category_counts = {}
    for t in all_tickets:
        c_val = t.category.value
        category_counts[c_val] = category_counts.get(c_val, 0) + 1
    by_category = [ChartDataPoint(label=k, value=v) for k, v in category_counts.items()]
    
    # By Project
    project_stmt = select(Project)
    projects = (await db.execute(project_stmt)).scalars().all()
    proj_map = {p.id: p.name for p in projects}
    proj_counts = {"General / Non-Project": 0}
    for p in projects:
        proj_counts[p.name] = 0
    for t in all_tickets:
        p_name = proj_map.get(t.project_id, "General / Non-Project")
        proj_counts[p_name] = proj_counts.get(p_name, 0) + 1
    by_project = [ChartDataPoint(label=k, value=v) for k, v in proj_counts.items() if v > 0 or len(proj_counts) <= 6]
    
    # By Employee (workload distribution)
    emp_stmt = select(User).where(User.is_active == True)
    employees = (await db.execute(emp_stmt)).scalars().all()
    emp_map = {e.id: e.full_name for e in employees}
    emp_counts = {}
    for t in all_tickets:
        if t.assigned_to_id:
            e_name = emp_map.get(t.assigned_to_id, "Staff")
            emp_counts[e_name] = emp_counts.get(e_name, 0) + 1
    by_employee = [ChartDataPoint(label=k, value=v) for k, v in emp_counts.items()]
    if not by_employee:
        by_employee = [ChartDataPoint(label="Unassigned", value=unassigned_t)]
        
    # Monthly Creation vs Resolution
    # Group by month string (e.g. 2026-11)
    monthly_data = {}
    for t in all_tickets:
        m_str = t.created_at.strftime("%b %Y")
        if m_str not in monthly_data:
            monthly_data[m_str] = {"month": m_str, "created": 0, "resolved": 0}
        monthly_data[m_str]["created"] += 1
        if t.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
            monthly_data[m_str]["resolved"] += 1
            
    charts = DashboardCharts(
        by_project=by_project,
        by_category=by_category,
        by_priority=by_priority,
        by_status=by_status,
        by_employee=by_employee,
        monthly_trend=list(monthly_data.values())
    )
    
    return {
        "stats": stats,
        "charts": charts
    }

@router.get("/export-csv")
async def export_tickets_csv(
    request: Request,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    # Authenticate via Header or Query Parameter
    jwt_str = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        jwt_str = auth_header.split(" ", 1)[1].strip()
    elif token:
        jwt_str = token.strip()

    if not jwt_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide Authorization header or access token parameter."
        )

    payload = decode_token(jwt_str)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or session expired."
        )

    user_res = await db.execute(select(User).where(User.id == payload["sub"]))
    current_user = user_res.scalar_one_or_none()
    if not current_user or not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or not found."
        )

    query = select(Ticket)
    if current_user.role == UserRole.EMPLOYEE:
        query = query.where(or_(Ticket.created_by_id == current_user.id, Ticket.assigned_to_id == current_user.id))
    query = query.order_by(desc(Ticket.created_at))
    
    tickets = (await db.execute(query)).scalars().all()
    
    # Get project and user lookup
    proj_res = await db.execute(select(Project))
    proj_map = {p.id: p.name for p in proj_res.scalars().all()}
    
    user_res = await db.execute(select(User))
    user_map = {u.id: u.full_name for u in user_res.scalars().all()}
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ticket ID", "Customer Name", "Customer Mobile", "Customer Email",
        "Project", "Unit/Plot", "Category", "Subject", "Priority",
        "Status", "Created By", "Assigned To", "Daily Update Status",
        "Created At", "Due Date", "Resolved At"
    ])
    
    for t in tickets:
        writer.writerow([
            t.ticket_number,
            t.customer_name,
            t.customer_mobile,
            t.customer_email or "",
            proj_map.get(t.project_id, "General"),
            t.unit_or_plot_number or "",
            t.category.value,
            t.subject,
            t.priority.value,
            t.status.value,
            user_map.get(t.created_by_id, "Unknown"),
            user_map.get(t.assigned_to_id, "Unassigned"),
            t.daily_update_status.value,
            t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            t.due_date.strftime("%Y-%m-%d") if t.due_date else "",
            t.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if t.resolved_at else ""
        ])
        
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=stepsstone_tickets_{datetime.now().strftime('%Y%m%d')}.csv"}
    )
