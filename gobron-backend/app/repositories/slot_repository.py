"""Data access for Slot — availability queries used by the calendar + booking."""
from datetime import date, time, timedelta

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SlotStatus
from app.models.field import Field
from app.models.slot import Slot
from app.utils.clock import now_local


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
            # A pitch open 08:00->01:00 plays its 00:00-01:00 slot on the next
            # calendar day, but the player thinks of it as tonight. Asking for
            # a day therefore means "the session that opened that day": that
            # day's slots plus the small hours that spill over into the next.
            overnight_tail = and_(
                Field.closing_time <= Field.opening_time,
                Slot.slot_date == on_date + timedelta(days=1),
                Slot.start_time < Field.closing_time,
            )
            stmt = stmt.join(Field, Slot.field_id == Field.id).where(
                or_(Slot.slot_date == on_date, overnight_tail)
            )
        if date_from is not None:
            stmt = stmt.where(Slot.slot_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Slot.slot_date <= date_to)
        if available_only:
            # "Available" has to mean bookable: a slot that already started
            # today is free in the DB but nobody can book it any more.
            now = now_local()
            stmt = stmt.where(
                Slot.status == SlotStatus.AVAILABLE,
                or_(
                    Slot.slot_date > now.date(),
                    and_(Slot.slot_date == now.date(), Slot.start_time > now.time()),
                ),
            )
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
