"""PaymentSettings — Humo receiving card + Telegram matcher credentials.

Single row (id=1). Card fields are shown to field owners; Telegram secrets
are superadmin-only.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PaymentSettings(Base):
    __tablename__ = "payment_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    card_number: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    card_holder: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    bank_name: Mapped[str | None] = mapped_column(String(100))
    subscription_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("50000"), nullable=False
    )

    # --- payment-matcher (GramJS userbot) — superadmin only ---
    telegram_api_id: Mapped[str | None] = mapped_column(String(32))
    telegram_api_hash: Mapped[str | None] = mapped_column(String(64))
    telegram_phone: Mapped[str | None] = mapped_column(String(32))
    # Cloud password (2FA) for Telegram login.
    telegram_2fa_password: Mapped[str | None] = mapped_column(String(255))
    # StringSession after first successful login.
    telegram_session: Mapped[str | None] = mapped_column(Text)
    humo_bot_username: Mapped[str | None] = mapped_column(
        String(64), default="HUMOcardbot"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
