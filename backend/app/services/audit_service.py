from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.models.models import AuditLog

async def log_audit_event(
    db: AsyncSession,
    action: str,
    entity_type: str,
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
    entity_id: Optional[str] = None,
    previous_value: Optional[str] = None,
    new_value: Optional[str] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Creates an immutable audit log entry in the database.
    """
    audit_entry = AuditLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        previous_value=str(previous_value) if previous_value else None,
        new_value=str(new_value) if new_value else None,
        ip_address=ip_address
    )
    db.add(audit_entry)
    # We do not commit immediately to allow grouping within parent transaction,
    # or caller will commit.
    return audit_entry
