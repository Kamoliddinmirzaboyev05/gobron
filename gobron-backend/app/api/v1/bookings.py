"""Booking endpoints — create (with recurrence), list mine, cancel."""
from decimal import Decimal

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DBSession
from app.models.enums import BookingStatus
from app.repositories.booking_repository import BookingRepository
from app.schemas.booking import (
    BookingCreate,
    BookingCreateResult,
    BookingOut,
)
from app.services.booking_service import BookingService, SlotUnavailableError

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingCreateResult, status_code=status.HTTP_201_CREATED)
async def create_booking(body: BookingCreate, db: DBSession, user: CurrentUser):
    try:
        bookings = await BookingService(db).create_booking(
            user_id=user.id,
            slot_ids=body.slot_ids,
            recurrence=body.recurrence_type,
            occurrences=body.occurrences,
        )
    except SlotUnavailableError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))

    total = sum((b.total_price for b in bookings), Decimal("0"))
    return BookingCreateResult(
        recurrence_group_id=bookings[0].recurrence_group_id,
        bookings=bookings,
        total_price=total,
    )


@router.get("", response_model=list[BookingOut])
async def my_bookings(
    db: DBSession, user: CurrentUser, status_filter: BookingStatus | None = None
):
    return await BookingRepository(db).list_for_user(user.id, status=status_filter)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(booking_id: int, db: DBSession, user: CurrentUser):
    try:
        return await BookingService(db).cancel_booking(
            booking_id=booking_id, user_id=user.id
        )
    except SlotUnavailableError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
