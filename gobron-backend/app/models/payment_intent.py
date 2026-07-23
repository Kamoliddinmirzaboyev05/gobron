"""PaymentIntent — unique-amount P2P order waiting for Humo notification match."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PaymentIntent(Base):
    __tablename__ = "payment_intents"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Integer so'm (no tiyin) — matches Humo message parsing.
    base_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    unique_amount: Mapped[int] = mapped_column(Integer, nullable=False)

    # pending | paid | expired | expired_paid
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    matched_message: Mapped[str | None] = mapped_column(Text)
    # SHA-256 of the Telegram message for idempotency.
    message_hash: Mapped[str | None] = mapped_column(String(64), unique=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship()  # noqa: F821


class UnmatchedTransaction(Base):
    """Humo messages that could not be auto-matched (manual review)."""

    __tablename__ = "unmatched_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    amount: Mapped[int | None] = mapped_column(Integer)
    raw_message: Mapped[str] = mapped_column(Text, nullable=False)
    message_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    # no_match | expired | parse_error
    reason: Mapped[str] = mapped_column(String(40), default="no_match", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
