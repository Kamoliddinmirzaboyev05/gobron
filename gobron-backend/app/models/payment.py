"""Payment model — a payment attempt against a booking (Click / Payme / cash)."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import PaymentProvider, PaymentStatus


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, index=True
    )

    provider: Mapped[PaymentProvider] = mapped_column(
        Enum(PaymentProvider, name="payment_provider"), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # External transaction id returned by the payment provider.
    transaction_id: Mapped[str | None] = mapped_column(String(120), index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    booking: Mapped["Booking"] = relationship(back_populates="payment")  # noqa: F821
