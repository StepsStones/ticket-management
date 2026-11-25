import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "StepsStone Ticket Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "stepsstone-secret-key-production-enterprise-2026-very-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days persistent access
    REFRESH_TOKEN_EXPIRE_DAYS: int = 60            # 60 days persistent refresh
    
    # Database
    # Support PostgreSQL primary, fall back to SQLite when testing or if PostgreSQL is not configured
    DATABASE_URL: str = "sqlite+aiosqlite:///./stepsstone_tickets.db"
    
    # File Storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    MAX_FILE_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "jpg", "jpeg", "png", "doc", "docx", "xlsx"]
    
    # Working Hours & Reminders
    WORK_START_HOUR: int = 9
    WORK_END_HOUR: int = 18
    DAILY_REMINDER_HOUR: int = 17
    DAILY_REMINDER_MINUTE: int = 30
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
