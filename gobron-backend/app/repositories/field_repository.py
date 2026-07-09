"""Data access for Field, including the public listing with filters."""
from __future__ import annotations  # `list` method shadows builtin otherwise

from datetime import date
from decimal import Decimal
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.enums import BookingStatus, SlotStatus
from app.models.field import Field
from app.models.slot import Slot

FieldSort = Literal["rating", "cheapest", "popular"]


class FieldRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, field_id: int) -> Field | None:
        return await self.db.get(Field, field_id)

    async def list(
        self,
        *,
        search: str | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        min_rating: float | None = None,
        owner_id: int | None = None,
        active_only: bool = True,
        available_today: bool = False,
        sort: FieldSort = "rating",
        limit: int = 50,
        offset: int = 0,
    ) -> list[Field]:
        stmt = select(Field)
        if active_only:
            stmt = stmt.where(Field.is_active.is_(True))
        if owner_id is not None:
            stmt = stmt.where(Field.owner_id == owner_id)
        if search:
            like = f"%{search}%"
            stmt = stmt.where(Field.name.ilike(like) | Field.address.ilike(like))
        if min_price is not None:
            stmt = stmt.where(Field.price_per_slot >= min_price)
        if max_price is not None:
            stmt = stmt.where(Field.price_per_slot <= max_price)
        if min_rating is not None:
            stmt = stmt.where(Field.rating >= min_rating)
        if available_today:
            has_open_slot_today = (
                select(Slot.id)
                .where(
                    Slot.field_id == Field.id,
                    Slot.status == SlotStatus.AVAILABLE,
                    Slot.slot_date == date.today(),
                )
                .exists()
            )
            stmt = stmt.where(has_open_slot_today)

        if sort == "cheapest":
            stmt = stmt.order_by(Field.price_per_slot.asc(), Field.id.desc())
        elif sort == "popular":
            booking_count = (
                select(func.count(Booking.id))
                .join(Slot, Booking.slot_id == Slot.id)
                .where(Slot.field_id == Field.id, Booking.status != BookingStatus.CANCELLED)
                .correlate(Field)
                .scalar_subquery()
            )
            stmt = stmt.order_by(booking_count.desc(), Field.id.desc())
        else:
            stmt = stmt.order_by(Field.rating.desc(), Field.id.desc())

        stmt = stmt.limit(limit).offset(offset)
        return list((await self.db.execute(stmt)).scalars().all())
