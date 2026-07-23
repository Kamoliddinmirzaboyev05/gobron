"""Periodic maintenance: rolling slot windows + settle finished bookings.

Runs inside the bot process (single instance) so multi-worker API does not
duplicate work. Safe to call more than once — both steps are idempotent.
"""
import logging

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.field import Field
from app.repositories.booking_repository import BookingRepository
from app.services.slot_service import SlotService
from app.utils.clock import today_local

logger = logging.getLogger(__name__)


async def run_maintenance() -> dict[str, int]:
    """Generate rolling slots for every active field and settle finished bookings."""
    slots_created = 0
    fields_touched = 0
    async with AsyncSessionLocal() as db:
        await BookingRepository(db).settle_finished_bookings()

        fields = list(
            (
                await db.execute(select(Field).where(Field.is_active.is_(True)))
            )
            .scalars()
            .all()
        )
        slots = SlotService(db)
        today = today_local()
        for field in fields:
            # booking_window_days includes today → days ahead = window - 1
            days_ahead = max(0, (field.booking_window_days or 3) - 1)
            await slots.prune_available_slots(field, today)
            created = await slots.generate_daily_slots(field, days_ahead)
            slots_created += len(created)
            fields_touched += 1
        await db.commit()

    return {"fields": fields_touched, "slots_created": slots_created}
