"""Data access for Booking — a user's reservations + admin listing."""
from datetime import date

from sqlalchemy import and_, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.enums import BookingStatus
from app.models.review import Review
from app.models.slot import Slot
from app.utils.clock import now_local


class BookingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, booking_id: int) -> Booking | None:
        return await self.db.get(Booking, booking_id)

    async def settle_finished_bookings(self) -> None:
        """Mark CONFIRMED bookings whose slot has ended as COMPLETED.

        Nothing else ever performs this transition, so without it a player
        booking stays CONFIRMED forever and can never be rated.

        ponytail: materialized on read (idempotent, one UPDATE). Move it to the
        daily job that slot generation also wants once one exists.
        """
        now = now_local()
        finished = (
            select(Slot.id)
            .where(
                or_(
                    Slot.slot_date < now.date(),
                    and_(Slot.slot_date == now.date(), Slot.end_time <= now.time()),
                )
            )
            .scalar_subquery()
        )
        await self.db.execute(
            update(Booking)
            .where(Booking.status == BookingStatus.CONFIRMED, Booking.slot_id.in_(finished))
            .values(status=BookingStatus.COMPLETED)
        )
        await self.db.commit()

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
        await self.settle_finished_bookings()
        stmt = (
            select(Booking)
            .where(Booking.user_id == user_id)
            .options(selectinload(Booking.slot))
            .order_by(Booking.created_at.desc())
        )
        if status is not None:
            stmt = stmt.where(Booking.status == status)
        bookings = list((await self.db.execute(stmt)).scalars().all())

        # BookingOut exposes the star rating this user left. Attach it as a
        # plain attribute rather than a relationship: a lazy-loading one would
        # blow up during response serialization (MissingGreenlet).
        if bookings:
            rows = await self.db.execute(
                select(Review.booking_id, Review.rating).where(
                    Review.booking_id.in_([b.id for b in bookings])
                )
            )
            by_booking = dict(rows.all())
            for booking in bookings:
                booking.rating = by_booking.get(booking.id)
        return bookings
