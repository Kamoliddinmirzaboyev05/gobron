"""Statistics service — dashboard metrics and reports.

All figures can be scoped to a single owner (Flutter admin) or global
(superadmin) by passing owner_id. Revenue counts CONFIRMED/COMPLETED bookings.
"""
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.enums import BookingStatus, SlotStatus
from app.models.field import Field
from app.models.slot import Slot
from app.schemas.stats import DashboardStats, PopularSlot, RevenuePoint

_REVENUE_STATUSES = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)


class StatsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def dashboard(
        self,
        *,
        owner_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> DashboardStats:
        today = date.today()
        date_from = date_from or (today - timedelta(days=29))
        date_to = date_to or today

        # Booking + slot joined, optionally scoped to one owner's fields.
        base = (
            select(Booking, Slot)
            .join(Slot, Booking.slot_id == Slot.id)
            .where(Slot.slot_date >= date_from, Slot.slot_date <= date_to)
        )
        if owner_id is not None:
            base = base.join(Field, Slot.field_id == Field.id).where(
                Field.owner_id == owner_id
            )

        # --- Revenue + booking totals ---
        rev_stmt = select(
            func.coalesce(func.sum(Booking.total_price), 0),
            func.count(Booking.id),
        ).select_from(base.where(Booking.status.in_(_REVENUE_STATUSES)).subquery())
        total_revenue, total_bookings = (await self.db.execute(rev_stmt)).one()

        # --- Active fields ---
        fields_stmt = select(func.count(Field.id)).where(Field.is_active.is_(True))
        if owner_id is not None:
            fields_stmt = fields_stmt.where(Field.owner_id == owner_id)
        active_fields = (await self.db.execute(fields_stmt)).scalar_one()

        # --- Occupancy: booked slots / total slots in range ---
        occupancy = await self._occupancy(owner_id, date_from, date_to)

        return DashboardStats(
            total_revenue=Decimal(total_revenue),
            total_bookings=int(total_bookings),
            active_fields=int(active_fields),
            occupancy_rate=occupancy,
            revenue_series=await self._revenue_series(owner_id, date_from, date_to),
            popular_slots=await self._popular_slots(owner_id, date_from, date_to),
        )

    async def _occupancy(
        self, owner_id: int | None, date_from: date, date_to: date
    ) -> float:
        stmt = select(
            func.count(Slot.id),
            func.sum(cast(Slot.status == SlotStatus.BOOKED, Integer)),
        ).where(Slot.slot_date >= date_from, Slot.slot_date <= date_to)
        if owner_id is not None:
            stmt = stmt.join(Field, Slot.field_id == Field.id).where(
                Field.owner_id == owner_id
            )
        total, booked = (await self.db.execute(stmt)).one()
        return round((booked or 0) / total, 4) if total else 0.0

    async def _revenue_series(
        self, owner_id: int | None, date_from: date, date_to: date
    ) -> list[RevenuePoint]:
        stmt = (
            select(
                Slot.slot_date,
                func.coalesce(func.sum(Booking.total_price), 0),
                func.count(Booking.id),
            )
            .join(Slot, Booking.slot_id == Slot.id)
            .where(
                Slot.slot_date >= date_from,
                Slot.slot_date <= date_to,
                Booking.status.in_(_REVENUE_STATUSES),
            )
            .group_by(Slot.slot_date)
            .order_by(Slot.slot_date)
        )
        if owner_id is not None:
            stmt = stmt.join(Field, Slot.field_id == Field.id).where(
                Field.owner_id == owner_id
            )
        rows = (await self.db.execute(stmt)).all()
        return [
            RevenuePoint(day=d, revenue=Decimal(rev), bookings=int(cnt))
            for d, rev, cnt in rows
        ]

    async def _popular_slots(
        self, owner_id: int | None, date_from: date, date_to: date, top: int = 5
    ) -> list[PopularSlot]:
        stmt = (
            select(Slot.start_time, func.count(Booking.id).label("cnt"))
            .join(Slot, Booking.slot_id == Slot.id)
            .where(
                Slot.slot_date >= date_from,
                Slot.slot_date <= date_to,
                Booking.status.in_(_REVENUE_STATUSES),
            )
            .group_by(Slot.start_time)
            .order_by(func.count(Booking.id).desc())
            .limit(top)
        )
        if owner_id is not None:
            stmt = stmt.join(Field, Slot.field_id == Field.id).where(
                Field.owner_id == owner_id
            )
        rows = (await self.db.execute(stmt)).all()
        return [
            PopularSlot(start_time=t.strftime("%H:%M"), bookings=int(cnt))
            for t, cnt in rows
        ]
