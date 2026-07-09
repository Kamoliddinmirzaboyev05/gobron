"""Booking endpoints — create (with recurrence), list mine, cancel."""
import logging
from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.deps import CurrentUser, DBSession
from app.models.enums import BookingStatus
from app.models.field import Field
from app.models.slot import Slot
from app.repositories.booking_repository import BookingRepository
from app.schemas.booking import (
    BookingCreate,
    BookingCreateResult,
    BookingOut,
)
from app.services.booking_service import BookingService, SlotUnavailableError
from app.services.push_service import PushService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["bookings"])


async def _notify_owner_of_request(slot_id: int, player_name: str, when: str) -> None:
    """Background task: tell the field's owner a booking request came in.

    Uses its own session - the request's session is already closed by the time
    background tasks run. Never raises: a push failure must not surface as a
    failed booking, the booking is already committed.
    """
    try:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(Field.owner_id, Field.name)
                .join(Slot, Slot.field_id == Field.id)
                .where(Slot.id == slot_id)
            )
            row = (await session.execute(stmt)).first()
            if row is None:
                return
            owner_id, field_name = row
            await PushService(session).send_to_user(
                owner_id,
                title="Yangi band qilish so'rovi",
                body=f"{player_name} — {field_name}, {when}",
            )
    except Exception:  # noqa: BLE001 - background task, log and move on
        logger.exception("failed to push booking request to owner")


@router.post("", response_model=BookingCreateResult, status_code=status.HTTP_201_CREATED)
async def create_booking(
    body: BookingCreate, db: DBSession, user: CurrentUser, background: BackgroundTasks
):
    try:
        bookings = await BookingService(db).create_booking(
            user_id=user.id,
            slot_ids=body.slot_ids,
            recurrence=body.recurrence_type,
            occurrences=body.occurrences,
        )
    except SlotUnavailableError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))

    first, last = bookings[0].slot, bookings[-1].slot
    background.add_task(
        _notify_owner_of_request,
        first.id,
        user.full_name,
        f"{first.slot_date} {first.start_time:%H:%M}–{last.end_time:%H:%M}",
    )

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
