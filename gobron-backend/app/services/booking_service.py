"""Booking service — the double-booking-safe reservation logic.

Concurrency: a Slot carries an optimistic-lock version_id (see Slot model). When
two players race for the same slot, both read it as AVAILABLE, but only the first
UPDATE commits; the second raises StaleDataError and we return a 409. No row
locks are held, so the DB stays snappy under load.

Recurrence:
  * ONCE   -> just the chosen slot(s).
  * DAILY  -> the same start_time on the next N days (that have a slot).
  * WEEKLY -> the same start_time every 7 days for the next N occurrences.
All occurrences share one recurrence_group_id so they can be listed/cancelled
together while remaining individually cancellable.

Multi-slot (ONCE only): a player can grab several back-to-back slots (e.g.
11:00-12:00 + 12:00-13:00) as one 2-hour booking, but not a gappy selection
like 11:00-12:00 + 15:00-16:00 - contiguity is enforced in _contiguous_slots.
They share a group_id the same way recurrence occurrences do.

Manual bookings (owner-entered) live in a separate table; we reject any player
booking that overlaps an active manual range on the same field.
"""
import uuid
from datetime import datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.exc import StaleDataError

from app.core.config import settings
from app.models.booking import Booking
from app.models.enums import BookingStatus, ManualBookingStatus, RecurrenceType, SlotStatus
from app.models.manual_booking import ManualBooking
from app.models.slot import Slot
from app.repositories.slot_repository import SlotRepository
from app.utils.clock import now_local


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

    def _contiguous_slots(self, slots: list[Slot]) -> list[Slot]:
        """Order the slots chronologically and verify they form one unbroken
        block on the same field (each slot's end_time is the next one's start).

        A late-night session crosses midnight, so 23:00-00:00 on day D is
        followed by 00:00-01:00 on day D+1. That's still one continuous block.
        """
        ordered = sorted(slots, key=lambda s: (s.slot_date, s.start_time))
        for prev, nxt in zip(ordered, ordered[1:]):
            if prev.field_id != nxt.field_id or prev.end_time != nxt.start_time:
                raise SlotUnavailableError("Slots must be back-to-back on the same field")
            crosses_midnight = prev.end_time == time(0, 0)
            expected_date = prev.slot_date + timedelta(days=1) if crosses_midnight else prev.slot_date
            if nxt.slot_date != expected_date:
                raise SlotUnavailableError("Slots must be back-to-back on the same field")
        return ordered

    async def _assert_no_manual_overlap(self, slot: Slot) -> None:
        """Reject if an owner manual booking already covers this slot's window."""
        stmt = select(ManualBooking.id).where(
            ManualBooking.field_id == slot.field_id,
            ManualBooking.booking_date == slot.slot_date,
            ManualBooking.status == ManualBookingStatus.BOOKED,
            ManualBooking.start_time < slot.end_time,
            ManualBooking.end_time > slot.start_time,
        ).limit(1)
        if (await self.db.execute(stmt)).scalar_one_or_none() is not None:
            raise SlotUnavailableError("Bu vaqt egasi tomonidan band qilingan")

    async def create_booking(
        self,
        *,
        user_id: int,
        slot_ids: list[int],
        recurrence: RecurrenceType = RecurrenceType.ONCE,
        occurrences: int = 1,
    ) -> list[Booking]:
        """Reserve one or more slots atomically. Commits on success.

        Raises SlotUnavailableError if any target slot is not bookable.
        """
        if recurrence != RecurrenceType.ONCE:
            anchor = await self.slots.get(slot_ids[0])
            if anchor is None:
                raise SlotUnavailableError("Slot not found")
            if anchor.status != SlotStatus.AVAILABLE:
                raise SlotUnavailableError("Slot is not available")
            targets = await self._target_slots(anchor, recurrence, occurrences)
        else:
            fetched = await self.slots.get_many(slot_ids)
            if len(fetched) != len(slot_ids):
                raise SlotUnavailableError("Slot not found")
            targets = self._contiguous_slots(fetched)
            if any(s.status != SlotStatus.AVAILABLE for s in targets):
                # All-or-nothing: partially booking a contiguous block would
                # leave the exact gap this feature exists to prevent.
                raise SlotUnavailableError("One of the selected slots is no longer available")

        for slot in targets:
            if slot.status == SlotStatus.AVAILABLE:
                await self._assert_no_manual_overlap(slot)

        group_id = str(uuid.uuid4()) if len(targets) > 1 else None

        bookings: list[Booking] = []
        booked_slots: list[Slot] = []
        for slot in targets:
            if slot.status != SlotStatus.AVAILABLE:
                continue  # skip occurrences already taken; book the rest (recurrence only)
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
            booked_slots.append(slot)

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
        # BookingOut serializes booking.slot; attach it from what we already
        # have in memory instead of letting pydantic trigger a lazy load,
        # which crashes outside greenlet context (MissingGreenlet) and turns
        # an already-committed, successful booking into a 500 for the caller.
        for booking, slot in zip(bookings, booked_slots):
            booking.slot = slot
        return bookings

    async def cancel_booking(self, *, booking_id: int, user_id: int) -> Booking:
        """Cancel a booking and free its slot. Only the owner may cancel."""
        booking = await self.db.get(Booking, booking_id)
        if booking is None or booking.user_id != user_id:
            raise SlotUnavailableError("Booking not found")
        if booking.status == BookingStatus.CANCELLED:
            return booking
        if booking.status == BookingStatus.COMPLETED:
            raise SlotUnavailableError("Tugagan bronni bekor qilib bo'lmaydi")

        slot = await self.slots.get(booking.slot_id)
        if slot is not None:
            self._assert_cancellable(slot)

        booking.status = BookingStatus.CANCELLED
        if slot is not None and slot.status == SlotStatus.BOOKED:
            slot.status = SlotStatus.AVAILABLE
        await self.db.commit()
        await self.db.refresh(booking)
        booking.slot = slot  # avoid the same lazy-load crash as create_booking
        return booking

    @staticmethod
    def _assert_cancellable(slot: Slot) -> None:
        """Players may cancel only while kickoff is far enough away."""
        now = now_local()
        kickoff = datetime.combine(slot.slot_date, slot.start_time)
        lead = kickoff - now
        min_lead = timedelta(minutes=settings.CANCEL_MIN_LEAD_MINUTES)
        if lead < min_lead:
            raise SlotUnavailableError(
                f"Bronni startga {settings.CANCEL_MIN_LEAD_MINUTES} daqiqa qolganda "
                "yoki keyinroq bekor qilib bo'lmaydi"
            )
