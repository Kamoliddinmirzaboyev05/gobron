"""Application configuration loaded from environment variables.

Uses Pydantic Settings so every value is validated and typed. Never hard-code
secrets — read them from a local .env file (see .env.example).
"""
from functools import lru_cache
from typing import Annotated

from pydantic import PostgresDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    APP_NAME: str = "Gobron API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    # Public origin this API is reachable at — used to build absolute upload URLs.
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    # --- Database ---
    # Async driver (asyncpg) is used everywhere in the app.
    DATABASE_URL: PostgresDsn = "postgresql+asyncpg://gobron:gobron@localhost:5432/gobron"

    # --- JWT / Auth ---
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # --- Superadmin seed (used by `python -m app.seed`) ---
    SUPERADMIN_USERNAME: str = "superadmin"
    SUPERADMIN_PASSWORD: str = "kamoliddin"

    # --- Telegram ---
    TELEGRAM_BOT_TOKEN: str = "change-me"       # from @BotFather
    TMA_URL: str = "http://localhost:5173"       # Mini App URL opened by the bot
    # Max age (seconds) accepted for a Telegram initData auth_date signature.
    TELEGRAM_INITDATA_MAX_AGE: int = 60 * 60 * 24

    # --- Web Push (admin-pwa notifications, delivered even while the app is closed) ---
    # Generate a real pair with `python -m py_vapid --gen` (or see push_service docs).
    VAPID_PUBLIC_KEY: str = "change-me-in-production"
    VAPID_PRIVATE_KEY: str = "change-me-in-production"
    VAPID_SUBJECT: str = "mailto:admin@gobron.uz"

    # --- OTP ---
    OTP_LENGTH: int = 6
    OTP_EXPIRE_SECONDS: int = 120
    # In development we skip real SMS and accept this master code.
    # Force False when ENVIRONMENT=production (see model_validator).
    OTP_DEV_MODE: bool = True
    OTP_DEV_CODE: str = "111111"

    # --- Booking policy ---
    # Players cannot cancel once this many minutes remain before kickoff.
    CANCEL_MIN_LEAD_MINUTES: int = 60

    # --- Rate limits (per key, sliding window) ---
    OTP_REQUEST_LIMIT: int = 5
    OTP_REQUEST_WINDOW_SECONDS: int = 600  # 5 / 10 min
    LOGIN_FAIL_LIMIT: int = 10
    LOGIN_FAIL_WINDOW_SECONDS: int = 600

    # --- CORS ---
    # "*" = allow all origins (Bearer JWT, no cookie credentials).
    # Comma-separated list also accepted from .env.
    CORS_ORIGINS: Annotated[list[str], NoDecode] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            parts = [o.strip() for o in v.split(",") if o.strip()]
            return parts or ["*"]
        return v

    @model_validator(mode="after")
    def _prod_safety(self):
        # Never accept master OTP codes in production, regardless of .env.
        if str(self.ENVIRONMENT).lower() == "production":
            self.OTP_DEV_MODE = False
        return self


@lru_cache
def get_settings() -> Settings:
    """Cached singleton so we parse the environment only once."""
    return Settings()


settings = get_settings()
