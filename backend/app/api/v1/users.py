from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, require_admin, require_super_admin
from app.models.models import User, UserRole, Ticket, TicketStatus, DailyUpdateStatus
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        s = f"%{search}%"
        query = query.where((User.full_name.ilike(s)) | (User.email.ilike(s)) | (User.username.ilike(s)))
        
    query = query.order_by(User.full_name.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Only Super Admin can create Super Admins or Admins
    if user_in.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN] and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can create administrative accounts."
        )
        
    # Check duplicate email/username
    existing = await db.execute(select(User).where((User.email == user_in.email) | (User.username == user_in.username)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email or username already exists.")
        
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        department=user_in.department,
        designation=user_in.designation,
        phone=user_in.phone,
        is_active=user_in.is_active
    )
    db.add(new_user)
    
    await log_audit_event(
        db=db,
        action="USER_CREATED",
        entity_type="User",
        user_id=current_user.id,
        user_name=current_user.full_name,
        new_value=f"Created {new_user.username} ({new_user.role.value})"
    )
    
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_in: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Super Admin protection
    if user.role == UserRole.SUPER_ADMIN and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot modify Super Admin accounts")
        
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.hashed_password = get_password_hash(update_data.pop("password"))
        
    prev_str = f"role={user.role}, active={user.is_active}"
    for field, val in update_data.items():
        setattr(user, field, val)
        
    new_str = f"role={user.role}, active={user.is_active}"
    await log_audit_event(
        db=db,
        action="USER_UPDATED",
        entity_type="User",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=user.id,
        previous_value=prev_str,
        new_value=new_str
    )
    
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/{user_id}/toggle-status", response_model=UserResponse)
async def toggle_user_status(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    if user.role == UserRole.SUPER_ADMIN and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot deactivate Super Admin")
        
    user.is_active = not user.is_active
    await log_audit_event(
        db=db,
        action="USER_STATUS_TOGGLED",
        entity_type="User",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=user.id,
        new_value=f"is_active={user.is_active}"
    )
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/workload/monitoring")
async def get_employee_workload(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns metrics per employee for Admin Monitoring panel:
    - Employee Name
    - Total Assigned Tickets
    - Open Tickets
    - In-progress Tickets
    - Overdue Tickets
    - Resolved Tickets
    - Pending Daily Updates
    """
    users_stmt = select(User).where(User.is_active == True).order_by(User.full_name.asc())
    users = (await db.execute(users_stmt)).scalars().all()
    
    data = []
    for u in users:
        # Query ticket counts for this user
        tkt_stmt = select(Ticket).where(Ticket.assigned_to_id == u.id)
        tkts = (await db.execute(tkt_stmt)).scalars().all()
        
        total = len(tkts)
        open_cnt = sum(1 for t in tkts if t.status in [TicketStatus.OPEN, TicketStatus.ASSIGNED])
        in_prog = sum(1 for t in tkts if t.status == TicketStatus.IN_PROGRESS)
        resolved = sum(1 for t in tkts if t.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED])
        overdue = sum(1 for t in tkts if t.daily_update_status == DailyUpdateStatus.OVERDUE)
        pending_daily = sum(1 for t in tkts if t.daily_update_status == DailyUpdateStatus.PENDING)
        
        data.append({
            "employee_id": u.id,
            "employee_name": u.full_name,
            "department": u.department,
            "designation": u.designation,
            "total_assigned": total,
            "open_tickets": open_cnt,
            "in_progress": in_prog,
            "resolved": resolved,
            "overdue": overdue,
            "pending_daily_updates": pending_daily
        })
        
    return data
