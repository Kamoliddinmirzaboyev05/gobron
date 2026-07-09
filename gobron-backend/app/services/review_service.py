"""Reviews — a player rates a pitch they actually booked.

Field.rating is a denormalized average, recomputed on every write. There are
far more reads (every listing sorts by it) than writes, so paying on write is
the cheap side.
"""
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.enums import BookingStatus
from app.models.field import Field
from app.models.review import Review
from app.models.slot import Slot


class ReviewError(Exception):
    """The booking can't be rated (not the user's, or not played yet)."""


_RATEABLE = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)


class ReviewService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def rate_booking(self, *, user_id: int, booking_id: int, rating: int) -> Review:
        booking = await self.db.get(Booking, booking_id)
        if booking is None or booking.user_id != user_id:
            raise ReviewError("Booking not found")
        if booking.status not in _RATEABLE:
            raise ReviewError("Faqat tasdiqlangan bronni baholash mumkin")

        field_id = (
            await self.db.execute(select(Slot.field_id).where(Slot.id == booking.slot_id))
        ).scalar_one()

        existing = (
            await self.db.execute(select(Review).where(Review.booking_id == booking_id))
        ).scalar_one_or_none()

        if existing is not None:
            existing.rating = rating  # let a player change their mind
            review = existing
        else:
            review = Review(
                booking_id=booking_id, user_id=user_id, field_id=field_id, rating=rating
            )
            self.db.add(review)

        await self.db.flush()
        await self._recompute_field_rating(field_id)
        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def _recompute_field_rating(self, field_id: int) -> None:
        average = (
            await self.db.execute(
                select(func.avg(Review.rating)).where(Review.field_id == field_id)
            )
        ).scalar_one()
        field = await self.db.get(Field, field_id)
        if field is not None:
            field.rating = round(float(average), 2) if average is not None else 0.0
