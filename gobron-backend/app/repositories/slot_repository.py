"""Data access for Slot — availability queries used by the calendar + booking."""
from datetime import date, time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SlotStatus
from app.models.slot import Slot


class SlotRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, slot_id: int) -> Slot | None:
        return await self.db.get(Slot, slot_id)

    async def get_many(self, slot_ids: list[int]) -> list[Slot]:
        stmt = select(Slot).where(Slot.id.in_(slot_ids))
        return list((await self.db.execute(stmt)).scalars().all())

    async def list_for_field(
        self,
        field_id: int,
        *,
        on_date: date | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        available_only: bool = False,
    ) -> list[Slot]:
        stmt = select(Slot).where(Slot.field_id == field_id)
        if on_date is not None:
            stmt = stmt.where(Slot.slot_date == on_date)
        if date_from is not None:
            stmt = stmt.where(Slot.slot_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Slot.slot_date <= date_to)
        if available_only:
            stmt = stmt.where(Slot.status == SlotStatus.AVAILABLE)
        stmt = stmt.order_by(Slot.slot_date, Slot.start_time)
        return list((await self.db.execute(stmt)).scalars().all())

    async def find_matching(
        self, field_id: int, slot_date: date, start_time: time
    ) -> Slot | None:
        """Locate the slot with the same field/start_time on another date.

        Used to build recurring bookings: the same weekday/time on future dates.
        """
        stmt = select(Slot).where(
            Slot.field_id == field_id,
            Slot.slot_date == slot_date,
            Slot.start_time == start_time,
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()
