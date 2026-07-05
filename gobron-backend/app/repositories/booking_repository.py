"""Data access for Booking — a user's reservations + admin listing."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.enums import BookingStatus
from app.models.slot import Slot


class BookingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, booking_id: int) -> Booking | None:
        return await self.db.get(Booking, booking_id)

    async def list_all(
        self,
        *,
        status: BookingStatus | None = None,
        field_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Booking]:
        """Admin: every booking, filterable by status/field/date range."""
        stmt = (
            select(Booking)
            .join(Slot, Booking.slot_id == Slot.id)
            .options(selectinload(Booking.slot), selectinload(Booking.user))
            .order_by(Booking.created_at.desc())
        )
        if status is not None:
            stmt = stmt.where(Booking.status == status)
        if field_id is not None:
            stmt = stmt.where(Slot.field_id == field_id)
        if date_from is not None:
            stmt = stmt.where(Slot.slot_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Slot.slot_date <= date_to)
        stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.execute(stmt)).scalars().all())

    async def list_for_user(
        self, user_id: int, *, status: BookingStatus | None = None
    ) -> list[Booking]:
        stmt = (
            select(Booking)
            .where(Booking.user_id == user_id)
            .options(selectinload(Booking.slot))
            .order_by(Booking.created_at.desc())
        )
        if status is not None:
            stmt = stmt.where(Booking.status == status)
        return list((await self.db.execute(stmt)).scalars().all())
