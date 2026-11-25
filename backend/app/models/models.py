import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, Float, Index
)
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    EMPLOYEE = "EMPLOYEE"

class TicketPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_CUSTOMER = "WAITING_FOR_CUSTOMER"
    WAITING_FOR_INTERNAL_TEAM = "WAITING_FOR_INTERNAL_TEAM"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"
    CANCELLED = "CANCELLED"

class TicketCategory(str, enum.Enum):
    LEGAL_QUERY = "Legal Query"
    LEGAL_DOCUMENT_VERIFICATION = "Legal Document Verification"
    LAND_DOCUMENT_ISSUES = "Land Document Issues"
    REGISTRATION_ISSUES = "Registration Issues"
    PATTA_CHITTA_EC_ISSUES = "Patta / Chitta / EC Issues"
    CUSTOMER_DOCUMENT_REQUEST = "Customer Document Request"
    PAYMENT_RELATED_QUERY = "Payment-Related Query"
    PROJECT_RELATED_COMPLAINT = "Project-Related Complaint"
    OTHER = "Other"

class FollowupType(str, enum.Enum):
    CUSTOMER_CALLED = "Customer Called"
    CUSTOMER_NOT_REACHABLE = "Customer Not Reachable"
    DOCUMENT_REQUESTED = "Document Requested"
    DOCUMENT_RECEIVED = "Document Received"
    LEGAL_VERIFICATION = "Legal Verification"
    INTERNAL_DISCUSSION = "Internal Discussion"
    PENDING_APPROVAL = "Pending Approval"
    OTHER = "Other"

class TimelineEventType(str, enum.Enum):
    CREATED = "Ticket Created"
    ASSIGNED = "Ticket Assigned"
    REASSIGNED = "Ticket Reassigned"
    VIEWED = "Ticket Viewed"
    COMMENT_ADDED = "Comment Added"
    DOCUMENT_UPLOADED = "Document Uploaded"
    FOLLOWUP_SCHEDULED = "Follow-up Scheduled"
    FOLLOWUP_COMPLETED = "Follow-up Completed"
    STATUS_CHANGED = "Status Changed"
    DAILY_UPDATE_SUBMITTED = "Daily Update Submitted"
    RESOLUTION_SUBMITTED = "Resolution Submitted"
    REOPENED = "Ticket Reopened"
    CLOSED = "Ticket Closed"

class DailyUpdateStatus(str, enum.Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    OVERDUE = "OVERDUE"

# ----------------- Models -----------------

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.EMPLOYEE)
    department = Column(String(100), nullable=True, default="Operations")
    designation = Column(String(100), nullable=True, default="Executive")
    phone = Column(String(30), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)
    
    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    created_tickets = relationship("Ticket", foreign_keys="[Ticket.created_by_id]", back_populates="creator")
    assigned_tickets = relationship("Ticket", foreign_keys="[Ticket.assigned_to_id]", back_populates="assignee")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token = Column(String(255), unique=True, nullable=False, index=True)
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(60), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    
    user = relationship("User", back_populates="sessions")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), unique=True, nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    location = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)
    
    tickets = relationship("Ticket", back_populates="project")

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    mobile = Column(String(30), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Customer Details
    customer_name = Column(String(255), nullable=False, index=True)
    customer_mobile = Column(String(30), nullable=False, index=True)
    customer_email = Column(String(255), nullable=True)
    
    # Project Link
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    unit_or_plot_number = Column(String(100), nullable=True)
    
    # Ticket Metadata
    category = Column(SQLEnum(TicketCategory), nullable=False, index=True)
    subject = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM, nullable=False, index=True)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN, nullable=False, index=True)
    
    # Staff Associations
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    assigned_to_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Deadlines and Resolution
    due_date = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    reopened_reason = Column(Text, nullable=True)
    
    # Daily Reminder & Escalation
    requires_daily_update = Column(Boolean, default=True, nullable=False)
    daily_update_status = Column(SQLEnum(DailyUpdateStatus), default=DailyUpdateStatus.PENDING, nullable=False)
    last_daily_update_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="tickets")
    creator = relationship("User", foreign_keys=[created_by_id], back_populates="created_tickets")
    assignee = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tickets")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    closed_by = relationship("User", foreign_keys=[closed_by_id])
    
    assignments = relationship("TicketAssignment", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    timeline_events = relationship("TicketTimeline", back_populates="ticket", order_by="TicketTimeline.created_at", cascade="all, delete-orphan")
    followups = relationship("TicketFollowup", back_populates="ticket", order_by="TicketFollowup.created_at.desc()", cascade="all, delete-orphan")
    daily_updates = relationship("DailyTicketUpdate", back_populates="ticket", order_by="DailyTicketUpdate.created_at.desc()", cascade="all, delete-orphan")

class TicketAssignment(Base):
    __tablename__ = "ticket_assignments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    assigned_to_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    
    ticket = relationship("Ticket", back_populates="assignments")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    follow_up_id = Column(String(36), ForeignKey("ticket_followups.id", ondelete="SET NULL"), nullable=True)
    file_name = Column(String(255), nullable=False)
    original_file_name = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    file_path = Column(String(500), nullable=False)
    uploaded_by_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    
    ticket = relationship("Ticket", back_populates="attachments")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])

class TicketComment(Base):
    __tablename__ = "ticket_comments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    comment_text = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    
    ticket = relationship("Ticket", back_populates="comments")
    author = relationship("User", foreign_keys=[user_id])

class TicketTimeline(Base):
    __tablename__ = "ticket_timeline"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name = Column(String(255), nullable=True)
    event_type = Column(SQLEnum(TimelineEventType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)
    
    ticket = relationship("Ticket", back_populates="timeline_events")
    user = relationship("User", foreign_keys=[user_id])

class TicketFollowup(Base):
    __tablename__ = "ticket_followups"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    followup_type = Column(SQLEnum(FollowupType), nullable=False)
    description = Column(Text, nullable=False)
    followup_date = Column(String(30), nullable=False)
    followup_time = Column(String(30), nullable=True)
    next_followup_date = Column(String(30), nullable=True)
    internal_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    
    ticket = relationship("Ticket", back_populates="followups")
    author = relationship("User", foreign_keys=[user_id])

class DailyTicketUpdate(Base):
    __tablename__ = "daily_ticket_updates"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    update_date = Column(String(30), nullable=False, index=True)
    current_progress = Column(Text, nullable=False)
    delay_reason = Column(Text, nullable=True)
    pending_dependencies = Column(Text, nullable=True)
    expected_resolution_date = Column(String(30), nullable=True)
    next_followup_date = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    
    ticket = relationship("Ticket", back_populates="daily_updates")
    author = relationship("User", foreign_keys=[user_id])

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=True)
    ticket_number = Column(String(50), nullable=True)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)
    
    user = relationship("User", back_populates="notifications")

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    email_enabled = Column(Boolean, default=True, nullable=False)
    inapp_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    
    user = relationship("User", back_populates="preferences")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_name = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(100), nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    ip_address = Column(String(60), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    setting_key = Column(String(100), unique=True, nullable=False, index=True)
    setting_value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)
