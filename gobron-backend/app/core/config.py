"""Application configuration loaded from environment variables.

Uses Pydantic Settings so every value is validated and typed. Never hard-code
secrets — read them from a local .env file (see .env.example).
"""
from functools import lru_cache
from typing import Annotated

from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    APP_NAME: str = "Gobron API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

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

    # --- OTP ---
    OTP_LENGTH: int = 6
    OTP_EXPIRE_SECONDS: int = 120
    # In development we skip real SMS and accept this master code.
    OTP_DEV_MODE: bool = True
    OTP_DEV_CODE: str = "111111"

    # --- CORS ---
    # NoDecode: don't JSON-parse this from .env; the validator below splits the
    # comma-separated string instead.
    CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",  # user-web (Next.js)
        "http://localhost:5173",  # superadmin (Vite)
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    """Cached singleton so we parse the environment only once."""
    return Settings()


settings = get_settings()
