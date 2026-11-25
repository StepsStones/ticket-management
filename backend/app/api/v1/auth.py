from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.models import User, UserSession, UserRole
from app.schemas.schemas import LoginRequest, Token, RefreshTokenRequest, UserResponse
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    # Lookup by username or email
    stmt = select(User).where(
        (User.username == login_data.username_or_email) | 
        (User.email == login_data.username_or_email)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact your system administrator."
        )
    
    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token()
    
    # Store refresh session in database
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")[:500]
    
    session_record = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        user_agent=user_agent,
        ip_address=client_ip,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        is_revoked=False
    )
    db.add(session_record)
    
    # Log audit event
    await log_audit_event(
        db=db,
        action="LOGIN",
        entity_type="User",
        user_id=user.id,
        user_name=user.full_name,
        entity_id=user.id,
        new_value=f"Login from {client_ip}",
        ip_address=client_ip
    )
    
    await db.commit()
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_req: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(UserSession).where(
        UserSession.refresh_token == refresh_req.refresh_token,
        UserSession.is_revoked == False
    )
    result = await db.execute(stmt)
    session_record = result.scalar_one_or_none()
    
    now = datetime.now(timezone.utc)
    if not session_record or session_record.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_res = await db.execute(select(User).where(User.id == session_record.user_id))
    user = user_res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or not found"
        )
    
    # Rotate refresh token
    new_refresh_token = create_refresh_token()
    session_record.is_revoked = True  # revoke old
    
    client_ip = request.client.host if request.client else "unknown"
    new_session = UserSession(
        user_id=user.id,
        refresh_token=new_refresh_token,
        user_agent=request.headers.get("user-agent", "unknown")[:500],
        ip_address=client_ip,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        is_revoked=False
    )
    db.add(new_session)
    await db.commit()
    
    new_access_token = create_access_token(user.id)
    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )

@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Invalidate active sessions for this user
    client_ip = request.client.host if request.client else "unknown"
    
    stmt = select(UserSession).where(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    for s in sessions:
        s.is_revoked = True
        
    await log_audit_event(
        db=db,
        action="LOGOUT",
        entity_type="User",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_id=current_user.id,
        ip_address=client_ip
    )
    await db.commit()
    return {"message": "Successfully logged out and session revoked"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
