from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.models import Project, Ticket, User
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    active_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Project)
    if active_only:
        query = query.where(Project.is_active == True)
    query = query.order_by(Project.name.asc())
    
    projects = (await db.execute(query)).scalars().all()
    
    results = []
    for p in projects:
        # count tickets
        count_res = await db.execute(select(func.count(Ticket.id)).where(Ticket.project_id == p.id))
        tkt_cnt = count_res.scalar() or 0
        resp = ProjectResponse.model_validate(p)
        resp.ticket_count = tkt_cnt
        results.append(resp)
        
    return results

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Check duplicate code or name
    dup = await db.execute(select(Project).where((Project.code == project_in.code) | (Project.name == project_in.name)))
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Project with this name or code already exists")
        
    project = Project(
        name=project_in.name,
        code=project_in.code,
        location=project_in.location,
        description=project_in.description,
        is_active=project_in.is_active
    )
    db.add(project)
    
    await log_audit_event(
        db=db,
        action="PROJECT_CREATED",
        entity_type="Project",
        user_id=current_user.id,
        user_name=current_user.full_name,
        new_value=f"{project.name} ({project.code})"
    )
    
    await db.commit()
    await db.refresh(project)
    
    resp = ProjectResponse.model_validate(project)
    resp.ticket_count = 0
    return resp

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    update_data = project_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(project, field, val)
        
    await log_audit_event(
        db=db,
        action="PROJECT_UPDATED",
        entity_type="Project",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=project.id,
        new_value=str(update_data)
    )
    
    await db.commit()
    await db.refresh(project)
    
    count_res = await db.execute(select(func.count(Ticket.id)).where(Ticket.project_id == project.id))
    resp = ProjectResponse.model_validate(project)
    resp.ticket_count = count_res.scalar() or 0
    return resp

@router.patch("/{project_id}/toggle-status", response_model=ProjectResponse)
async def toggle_project_status(
    project_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.is_active = not project.is_active
    await log_audit_event(
        db=db,
        action="PROJECT_STATUS_TOGGLED",
        entity_type="Project",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=project.id,
        new_value=f"is_active={project.is_active}"
    )
    await db.commit()
    await db.refresh(project)
    
    count_res = await db.execute(select(func.count(Ticket.id)).where(Ticket.project_id == project.id))
    resp = ProjectResponse.model_validate(project)
    resp.ticket_count = count_res.scalar() or 0
    return resp
