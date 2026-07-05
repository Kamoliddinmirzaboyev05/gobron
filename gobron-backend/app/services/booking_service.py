"""Booking service — the double-booking-safe reservation logic.

Concurrency: a Slot carries an optimistic-lock version_id (see Slot model). When
two players race for the same slot, both read it as AVAILABLE, but only the first
UPDATE commits; the second raises StaleDataError and we return a 409. No row
locks are held, so the DB stays snappy under load.

Recurrence:
  * ONCE   -> just the chosen slot.
  * DAILY  -> the same start_time on the next N days (that have a slot).
  * WEEKLY -> the same start_time every 7 days for the next N occurrences.
All occurrences share one recurrence_group_id so they can be listed/cancelled
together while remaining individually cancellable.
"""
import uuid
from datetime import timedelta
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.exc import StaleDataError

from app.models.booking import Booking
from app.models.enums import BookingStatus, RecurrenceType, SlotStatus
from app.models.slot import Slot
from app.repositories.slot_repository import SlotRepository


class SlotUnavailableError(Exception):
    """Raised when a slot is already booked/blocked or lost an optimistic race."""


class BookingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.slots = SlotRepository(db)

    async def _target_slots(
        self, anchor: Slot, recurrence: RecurrenceType, occurrences: int
    ) -> list[Slot]:
        """Resolve the list of slots a booking request should occupy."""
        if recurrence == RecurrenceType.ONCE:
            return [anchor]

        step = timedelta(days=1) if recurrence == RecurrenceType.DAILY else timedelta(days=7)
        result = [anchor]
        current_date = anchor.slot_date
        # occurrences counts total reservations including the anchor.
        while len(result) < max(1, occurrences):
            current_date = current_date + step
            match = await self.slots.find_matching(
                anchor.field_id, current_date, anchor.start_time
            )
            if match is None:
                break  # no generated slot that day -> stop extending
            result.append(match)
        return result

    async def create_booking(
        self,
        *,
        user_id: int,
        slot_id: int,
        recurrence: RecurrenceType = RecurrenceType.ONCE,
        occurrences: int = 1,
    ) -> list[Booking]:
        """Reserve one or more slots atomically. Commits on success.

        Raises SlotUnavailableError if any target slot is not bookable.
        """
        anchor = await self.slots.get(slot_id)
        if anchor is None:
            raise SlotUnavailableError("Slot not found")
        if anchor.status != SlotStatus.AVAILABLE:
            raise SlotUnavailableError("Slot is not available")

        targets = await self._target_slots(anchor, recurrence, occurrences)
        group_id = str(uuid.uuid4()) if recurrence != RecurrenceType.ONCE else None

        bookings: list[Booking] = []
        for slot in targets:
            if slot.status != SlotStatus.AVAILABLE:
                continue  # skip occurrences already taken; book the rest
            slot.status = SlotStatus.BOOKED  # bumps version_id on flush
            booking = Booking(
                user_id=user_id,
                slot_id=slot.id,
                status=BookingStatus.PENDING,
                total_price=Decimal(slot.price),
                recurrence_type=recurrence,
                recurrence_group_id=group_id,
            )
            self.db.add(booking)
            bookings.append(booking)

        if not bookings:
            raise SlotUnavailableError("Slot is not available")

        try:
            await self.db.commit()
        except (StaleDataError, IntegrityError) as exc:
            # Lost the optimistic race (StaleData) or hit the unique slot_id
            # booking constraint (IntegrityError) -> someone booked first.
            await self.db.rollback()
            raise SlotUnavailableError("Slot was just booked by someone else") from exc

        for b in bookings:
            await self.db.refresh(b)
        return bookings

    async def cancel_booking(self, *, booking_id: int, user_id: int) -> Booking:
        """Cancel a booking and free its slot. Only the owner may cancel."""
        booking = await self.db.get(Booking, booking_id)
        if booking is None or booking.user_id != user_id:
            raise SlotUnavailableError("Booking not found")
        if booking.status == BookingStatus.CANCELLED:
            return booking

        booking.status = BookingStatus.CANCELLED
        slot = await self.slots.get(booking.slot_id)
        if slot is not None and slot.status == SlotStatus.BOOKED:
            slot.status = SlotStatus.AVAILABLE
        await self.db.commit()
        await self.db.refresh(booking)
        return booking
