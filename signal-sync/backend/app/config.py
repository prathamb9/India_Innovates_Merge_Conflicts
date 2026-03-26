from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    app_env: str = "development"
    secret_key: str = "change_me"
    cors_origins: List[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "postgresql+asyncpg://signalsync:signalsync_dev@localhost:5432/signalsync"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Firebase
    firebase_service_account_path: str = "./firebase-service-account.json"

    # ML / Vision
    ml_service_url: str = "http://localhost:8001"
    vision_confidence_threshold: float = 0.85

    # Signal timing (seconds)
    default_green_duration: int = 30
    default_yellow_duration: int = 3
    default_red_duration: int = 30
    green_corridor_advance_sec: int = 30

    # LLM Integration
    groq_api_key: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
