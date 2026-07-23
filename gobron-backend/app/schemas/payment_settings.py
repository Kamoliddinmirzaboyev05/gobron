"""Schemas for Humo card + Telegram matcher settings."""
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PaymentSettingsIn(BaseModel):
    """Superadmin write — card + optional Telegram matcher secrets."""

    card_number: str = Field(..., max_length=32)
    card_holder: str = Field(..., min_length=1, max_length=150)
    bank_name: str | None = Field(None, max_length=100)
    subscription_amount: float = Field(50_000, ge=1000, le=50_000_000)

    telegram_api_id: str | None = Field(None, max_length=32)
    telegram_api_hash: str | None = Field(None, max_length=64)
    telegram_phone: str | None = Field(None, max_length=32)
    telegram_2fa_password: str | None = Field(None, max_length=255)
    telegram_session: str | None = None
    humo_bot_username: str | None = Field("HUMOcardbot", max_length=64)

    @field_validator("card_number")
    @classmethod
    def _digits_only(cls, value: str) -> str:
        digits = re.sub(r"\s", "", value)
        if not digits.isdigit() or not 16 <= len(digits) <= 20:
            raise ValueError("Karta raqami 16-20 ta raqamdan iborat bo'lishi kerak")
        return " ".join(digits[i : i + 4] for i in range(0, len(digits), 4))

    @field_validator("telegram_phone")
    @classmethod
    def _phone(cls, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        v = str(value).strip().replace(" ", "")
        if not v.startswith("+"):
            v = "+" + v.lstrip("0")
        return v

    @field_validator("humo_bot_username")
    @classmethod
    def _bot(cls, value: str | None) -> str | None:
        if not value:
            return "HUMOcardbot"
        return value.replace("@", "").strip()


class PaymentSettingsOut(BaseModel):
    """Public card fields for field owners (no Telegram secrets)."""

    model_config = ConfigDict(from_attributes=True)

    card_number: str
    card_holder: str
    bank_name: str | None
    subscription_amount: float


class PaymentSettingsAdminOut(PaymentSettingsOut):
    """Superadmin view — includes matcher / 2FA fields."""

    telegram_api_id: str | None = None
    telegram_api_hash: str | None = None
    telegram_phone: str | None = None
    telegram_2fa_password: str | None = None
    telegram_session: str | None = None
    humo_bot_username: str | None = "HUMOcardbot"
    # Convenience for UI: session already saved?
    has_session: bool = False

    @classmethod
    def from_row(cls, row) -> "PaymentSettingsAdminOut":
        return cls(
            card_number=row.card_number,
            card_holder=row.card_holder,
            bank_name=row.bank_name,
            subscription_amount=float(row.subscription_amount or 0),
            telegram_api_id=row.telegram_api_id,
            telegram_api_hash=row.telegram_api_hash,
            telegram_phone=row.telegram_phone,
            telegram_2fa_password=row.telegram_2fa_password,
            telegram_session=row.telegram_session,
            humo_bot_username=row.humo_bot_username or "HUMOcardbot",
            has_session=bool(row.telegram_session and str(row.telegram_session).strip()),
        )
