"""Booking model — a player's reservation of a slot.

Recurring bookings ("Bir marta", "Har kuni", "Har hafta") are represented as a
group of individual Booking rows that share the same `recurrence_group_id`, one
row per generated slot. This keeps each occurrence independently cancellable.
"""
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
from app.models.enums import BookingStatus, RecurrenceType


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # One booking occupies exactly one slot.
    slot_id: Mapped[int] = mapped_column(
        ForeignKey("slots.id", ondelete="CASCADE"), unique=True, index=True
    )

    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status"),
        default=BookingStatus.PENDING,
        nullable=False,
        index=True,
    )
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))

    # Recurrence metadata. All occurrences of one recurring reservation share the
    # same group id (a UUID string). ONCE bookings have a null group id.
    recurrence_type: Mapped[RecurrenceType] = mapped_column(
        Enum(RecurrenceType, name="recurrence_type"),
        default=RecurrenceType.ONCE,
        nullable=False,
    )
    recurrence_group_id: Mapped[str | None] = mapped_column(String(36), index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="bookings")  # noqa: F821
    slot: Mapped["Slot"] = relationship(back_populates="booking")  # noqa: F821
    payment: Mapped["Payment | None"] = relationship(  # noqa: F821
        back_populates="booking", uselist=False, cascade="all, delete-orphan"
    )
