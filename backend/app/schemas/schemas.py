from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from app.models.models import (
    UserRole, TicketPriority, TicketStatus, TicketCategory, FollowupType, TimelineEventType, DailyUpdateStatus
)

# ----------------- Auth & Token Schemas -----------------
class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

# ----------------- User Schemas -----------------
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    role: UserRole = UserRole.EMPLOYEE
    department: Optional[str] = "Operations"
    designation: Optional[str] = "Executive"
    phone: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- Project Schemas -----------------
class ProjectBase(BaseModel):
    name: str
    code: str
    location: str
    description: Optional[str] = None
    is_active: bool = True

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime
    ticket_count: Optional[int] = 0

    class Config:
        from_attributes = True

# ----------------- Attachment Schemas -----------------
class AttachmentResponse(BaseModel):
    id: str
    ticket_id: str
    file_name: str
    original_file_name: str
    file_type: str
    file_size: int
    file_path: str
    uploaded_by_id: str
    uploaded_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Comment Schemas -----------------
class CommentCreate(BaseModel):
    comment_text: str
    is_internal: bool = True

class CommentResponse(BaseModel):
    id: str
    ticket_id: str
    user_id: str
    user_name: Optional[str] = None
    comment_text: str
    is_internal: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Timeline Schemas -----------------
class TimelineResponse(BaseModel):
    id: str
    ticket_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    event_type: TimelineEventType
    title: str
    description: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Followup Schemas -----------------
class FollowupCreate(BaseModel):
    followup_type: FollowupType
    description: str
    followup_date: str
    followup_time: Optional[str] = None
    next_followup_date: Optional[str] = None
    internal_remarks: Optional[str] = None

class FollowupResponse(BaseModel):
    id: str
    ticket_id: str
    user_id: str
    user_name: Optional[str] = None
    followup_type: FollowupType
    description: str
    followup_date: str
    followup_time: Optional[str] = None
    next_followup_date: Optional[str] = None
    internal_remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Daily Update Schemas -----------------
class DailyUpdateCreate(BaseModel):
    current_progress: str
    delay_reason: Optional[str] = None
    pending_dependencies: Optional[str] = None
    expected_resolution_date: Optional[str] = None
    next_followup_date: Optional[str] = None

class DailyUpdateResponse(BaseModel):
    id: str
    ticket_id: str
    user_id: str
    user_name: Optional[str] = None
    update_date: str
    current_progress: str
    delay_reason: Optional[str] = None
    pending_dependencies: Optional[str] = None
    expected_resolution_date: Optional[str] = None
    next_followup_date: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Ticket Schemas -----------------
class TicketCreate(BaseModel):
    customer_name: str
    customer_mobile: str
    customer_email: Optional[EmailStr] = None
    project_id: Optional[str] = None
    unit_or_plot_number: Optional[str] = None
    category: TicketCategory
    subject: str
    description: str
    priority: TicketPriority = TicketPriority.MEDIUM
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[str] = None

class TicketUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_mobile: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    project_id: Optional[str] = None
    unit_or_plot_number: Optional[str] = None
    category: Optional[TicketCategory] = None
    priority: Optional[TicketPriority] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None

class TicketAssignRequest(BaseModel):
    assigned_to_id: str
    notes: Optional[str] = None

class TicketStatusUpdateRequest(BaseModel):
    status: TicketStatus
    notes: Optional[str] = None

class TicketResolveRequest(BaseModel):
    resolution_notes: str

class TicketReopenRequest(BaseModel):
    reopened_reason: str

class TicketListItem(BaseModel):
    id: str
    ticket_number: str
    customer_name: str
    customer_mobile: str
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    created_by_name: str
    assigned_to_name: Optional[str] = None
    assigned_to_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    due_date: Optional[datetime] = None
    daily_update_status: DailyUpdateStatus
    attachment_count: int = 0

    class Config:
        from_attributes = True

class TicketDetailResponse(BaseModel):
    id: str
    ticket_number: str
    customer_name: str
    customer_mobile: str
    customer_email: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    unit_or_plot_number: Optional[str] = None
    category: TicketCategory
    subject: str
    description: str
    priority: TicketPriority
    status: TicketStatus
    created_by_id: str
    created_by_name: str
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    due_date: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    resolved_by_id: Optional[str] = None
    resolved_by_name: Optional[str] = None
    resolved_at: Optional[datetime] = None
    closed_by_id: Optional[str] = None
    closed_by_name: Optional[str] = None
    closed_at: Optional[datetime] = None
    reopened_reason: Optional[str] = None
    requires_daily_update: bool
    daily_update_status: DailyUpdateStatus
    last_daily_update_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    attachments: List[AttachmentResponse] = []
    comments: List[CommentResponse] = []
    followups: List[FollowupResponse] = []
    daily_updates: List[DailyUpdateResponse] = []
    timeline: List[TimelineResponse] = []

    class Config:
        from_attributes = True

# ----------------- Notification Schemas -----------------
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    ticket_id: Optional[str] = None
    ticket_number: Optional[str] = None
    type: str
    title: str
    message: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Audit Log Schemas -----------------
class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Dashboard & Analytics Schemas -----------------
class DashboardStats(BaseModel):
    total_tickets: int = 0
    new_tickets: int = 0
    unassigned_tickets: int = 0
    assigned_tickets: int = 0
    in_progress: int = 0
    waiting_customer: int = 0
    waiting_internal: int = 0
    overdue_tickets: int = 0
    resolved_tickets: int = 0
    closed_tickets: int = 0
    pending_daily_updates: int = 0

class ChartDataPoint(BaseModel):
    label: str
    value: int
    color: Optional[str] = None

class DashboardCharts(BaseModel):
    by_project: List[ChartDataPoint]
    by_category: List[ChartDataPoint]
    by_priority: List[ChartDataPoint]
    by_status: List[ChartDataPoint]
    by_employee: List[ChartDataPoint]
    monthly_trend: List[Dict[str, Any]]
