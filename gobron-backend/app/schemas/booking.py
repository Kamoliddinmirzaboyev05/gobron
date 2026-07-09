"""Booking schemas — create (with recurrence) + read."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import BookingStatus, RecurrenceType
from app.schemas.slot import SlotOut


class BookingCreate(BaseModel):
    # Multiple ids = one contiguous multi-hour booking (validated + priced as
    # a unit in BookingService). Recurrence only makes sense for a single
    # anchor slot, so it's rejected here rather than deep in the service.
    slot_ids: list[int] = Field(..., min_length=1)
    recurrence_type: RecurrenceType = RecurrenceType.ONCE
    # How many future occurrences to book for daily/weekly recurrence.
    occurrences: int = 1

    @model_validator(mode="after")
    def _single_slot_for_recurrence(self) -> "BookingCreate":
        if self.recurrence_type != RecurrenceType.ONCE and len(self.slot_ids) != 1:
            raise ValueError("Recurring bookings must specify exactly one slot_id")
        return self


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    slot_id: int
    status: BookingStatus
    total_price: Decimal
    recurrence_type: RecurrenceType
    recurrence_group_id: str | None
    created_at: datetime
    slot: SlotOut | None = None


class BookingCreateResult(BaseModel):
    """One create call may produce several bookings (recurring)."""
    recurrence_group_id: str | None
    bookings: list[BookingOut]
    total_price: Decimal


class _UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str | None
    first_name: str | None
    last_name: str | None


class AdminBookingOut(BookingOut):
    """Booking enriched with the player's info for the admin table."""
    user: _UserBrief | None = None
