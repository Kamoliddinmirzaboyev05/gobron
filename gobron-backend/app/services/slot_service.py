"""Slot Generation Engine — the heart of Gobron's scheduling.

Responsibilities:
  * generate_slots_for_field  -> auto-create slots across a date range from a
    field's opening/closing time, slot_duration and working_days.
  * generate_daily_slots      -> convenience wrapper used by a daily cron/job.
  * add_manual_slot           -> owner creates a single slot by hand.
  * block_slot / unblock_slot -> owner takes a slot offline / back online.

Design notes:
  * Generation is idempotent: an existing (field, date, start_time) slot is
    never duplicated (guarded by a DB unique constraint + an in-memory check),
    so the job can safely run repeatedly.
  * We only ever touch AVAILABLE slots when regenerating — booked or blocked
    slots are left untouched.
"""
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SlotStatus
from app.models.field import Field
from app.models.slot import Slot
from app.utils.pricing import compute_slot_price


def _iter_start_times(
    opening: time, closing: time, duration_minutes: int
) -> list[tuple[time, time]]:
    """Yield (start, end) pairs tiling [opening, closing) by ``duration_minutes``.

    A partial trailing window that would run past ``closing`` is discarded, so
    every returned slot fits entirely within opening hours.
    """
    pairs: list[tuple[time, time]] = []
    # Use a dummy date to do time arithmetic safely.
    anchor = date(2000, 1, 1)
    cursor = datetime.combine(anchor, opening)
    end_of_day = datetime.combine(anchor, closing)
    step = timedelta(minutes=duration_minutes)

    while cursor + step <= end_of_day:
        start = cursor.time()
        end = (cursor + step).time()
        pairs.append((start, end))
        cursor += step
    return pairs


class SlotService:
    """Encapsulates all slot lifecycle logic for a given DB session."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_slots_for_field(
        self,
        field: Field,
        start_date: date,
        end_date: date,
    ) -> list[Slot]:
        """Create AVAILABLE slots for ``field`` from start_date..end_date inclusive.

        Skips days not in the field's working_days and any slot that already
        exists. Returns the list of newly created slots.
        """
        if not field.is_active:
            return []

        # Preload existing (date, start_time) keys to stay idempotent without a
        # round-trip per candidate slot.
        existing_stmt = select(Slot.slot_date, Slot.start_time).where(
            Slot.field_id == field.id,
            Slot.slot_date >= start_date,
            Slot.slot_date <= end_date,
        )
        existing_rows = (await self.db.execute(existing_stmt)).all()
        existing_keys = {(r.slot_date, r.start_time) for r in existing_rows}

        time_windows = _iter_start_times(
            field.opening_time, field.closing_time, field.slot_duration
        )

        new_slots: list[Slot] = []
        current = start_date
        while current <= end_date:
            # Python weekday(): Monday=0 ... Sunday=6, matching working_days.
            if current.weekday() in field.working_days:
                for start_t, end_t in time_windows:
                    if (current, start_t) in existing_keys:
                        continue
                    price = compute_slot_price(
                        base_price=field.price_per_slot,
                        start_time=start_t,
                        peak_start_time=field.peak_start_time,
                        peak_multiplier=field.peak_price_multiplier,
                    )
                    slot = Slot(
                        field_id=field.id,
                        slot_date=current,
                        start_time=start_t,
                        end_time=end_t,
                        status=SlotStatus.AVAILABLE,
                        price=price,
                    )
                    self.db.add(slot)
                    new_slots.append(slot)
            current += timedelta(days=1)

        await self.db.flush()
        return new_slots

    async def generate_daily_slots(self, field: Field, days_ahead: int = 14) -> list[Slot]:
        """Generate a rolling window of slots starting today.

        Intended to be called from a scheduled job so there are always
        ``days_ahead`` days of availability visible to players.
        """
        today = date.today()
        return await self.generate_slots_for_field(
            field, today, today + timedelta(days=days_ahead)
        )

    async def add_manual_slot(
        self,
        field: Field,
        slot_date: date,
        start_time: time,
        end_time: time,
        price: float | None = None,
    ) -> Slot:
        """Create a single slot by hand (owner-defined window)."""
        effective_price = (
            price
            if price is not None
            else compute_slot_price(
                base_price=field.price_per_slot,
                start_time=start_time,
                peak_start_time=field.peak_start_time,
                peak_multiplier=field.peak_price_multiplier,
            )
        )
        slot = Slot(
            field_id=field.id,
            slot_date=slot_date,
            start_time=start_time,
            end_time=end_time,
            status=SlotStatus.AVAILABLE,
            price=effective_price,
        )
        self.db.add(slot)
        await self.db.flush()
        return slot

    async def _get_slot(self, slot_id: int) -> Slot | None:
        return await self.db.get(Slot, slot_id)

    async def block_slot(self, slot_id: int) -> Slot:
        """Take an AVAILABLE slot offline (maintenance, private event...)."""
        slot = await self._get_slot(slot_id)
        if slot is None:
            raise ValueError("Slot not found")
        if slot.status == SlotStatus.BOOKED:
            raise ValueError("Cannot block a slot that is already booked")
        slot.status = SlotStatus.BLOCKED
        await self.db.flush()
        return slot

    async def unblock_slot(self, slot_id: int) -> Slot:
        """Return a BLOCKED slot to AVAILABLE."""
        slot = await self._get_slot(slot_id)
        if slot is None:
            raise ValueError("Slot not found")
        if slot.status != SlotStatus.BLOCKED:
            raise ValueError("Only blocked slots can be unblocked")
        slot.status = SlotStatus.AVAILABLE
        await self.db.flush()
        return slot
