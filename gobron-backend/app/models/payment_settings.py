"""PaymentSettings — the card field owners send their subscription fee to.

A single row (id=1). It's the platform's own receiving card, edited by the
superadmin and displayed read-only to owners; no player or owner card data is
ever stored here.
"""
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PaymentSettings(Base):
    __tablename__ = "payment_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    card_number: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    card_holder: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    bank_name: Mapped[str | None] = mapped_column(String(100))

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
