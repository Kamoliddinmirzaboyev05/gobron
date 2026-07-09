"""Owner endpoints used by the Flutter admin app."""
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select

from app.core.deps import DBSession, require_role
from app.models.broadcast import Broadcast
from app.models.enums import BroadcastAudience, UserRole
from app.models.user import User
from app.schemas.broadcast import BroadcastOut
from app.schemas.subscription import SubscriptionPaymentOut, SubscriptionPaymentCreate
from app.schemas.owner import (
    ManualBookingCreate,
    ManualBookingOut,
    ManualBookingUpdate,
    OwnerBookingOut,
    OwnerFieldIn,
    OwnerFieldOut,
    OwnerStatsSummary,
    VenueIn,
    VenueOut,
)
from app.schemas.booking import AdminBookingOut
from app.services.owner_service import OwnerService

router = APIRouter(prefix="/owner", tags=["owner"])

_owner = require_role(UserRole.FIELD_OWNER, UserRole.SUPERADMIN)


@router.get("/venue", response_model=VenueOut)
async def get_venue(db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).get_or_create_venue(user)


@router.put("/venue", response_model=VenueOut)
async def put_venue(body: VenueIn, db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).upsert_venue(user, body)


@router.get("/fields", response_model=list[OwnerFieldOut])
async def list_fields(db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).list_fields(user)


@router.post(
    "/fields", response_model=OwnerFieldOut, status_code=status.HTTP_201_CREATED
)
async def create_field(body: OwnerFieldIn, db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).create_field(user, body)


@router.patch("/fields/{field_id}", response_model=OwnerFieldOut)
async def update_field(
    field_id: int,
    body: OwnerFieldIn,
    db: DBSession,
    user: User = Depends(_owner),
):
    return await OwnerService(db).update_field(user, field_id, body)


@router.delete("/fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(field_id: int, db: DBSession, user: User = Depends(_owner)):
    await OwnerService(db).delete_field(user, field_id)


@router.get("/bookings", response_model=list[OwnerBookingOut])
async def list_bookings(
    db: DBSession,
    user: User = Depends(_owner),
    booking_date: date | None = Query(None, alias="date"),
):
    return await OwnerService(db).list_bookings(user, booking_date)


@router.post(
    "/bookings",
    response_model=ManualBookingOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_booking(
    body: ManualBookingCreate,
    db: DBSession,
    user: User = Depends(_owner),
):
    return await OwnerService(db).create_manual_booking(user, body)


@router.patch("/bookings/{booking_id}", response_model=ManualBookingOut)
async def update_booking(
    booking_id: int,
    body: ManualBookingUpdate,
    db: DBSession,
    user: User = Depends(_owner),
):
    return await OwnerService(db).update_booking(user, booking_id, body)


@router.post("/bookings/{booking_id}/cancel", response_model=ManualBookingOut)
async def cancel_booking(
    booking_id: int,
    db: DBSession,
    user: User = Depends(_owner),
):
    return await OwnerService(db).cancel_booking(user, booking_id)


@router.post("/bookings/{booking_id}/complete", response_model=ManualBookingOut)
async def complete_booking(
    booking_id: int,
    db: DBSession,
    user: User = Depends(_owner),
):
    return await OwnerService(db).complete_booking(user, booking_id)


@router.get("/requests", response_model=list[AdminBookingOut])
async def list_booking_requests(
    db: DBSession,
    user: User = Depends(_owner),
):
    return await OwnerService(db).list_booking_requests(user)


@router.post("/requests/{booking_id}/accept", response_model=AdminBookingOut)
async def accept_booking_request(
    booking_id: int,
    db: DBSession,
    user: User = Depends(_owner),
):
    return await OwnerService(db).accept_booking_request(user, booking_id)


@router.post("/requests/{booking_id}/reject", response_model=AdminBookingOut)
async def reject_booking_request(
    booking_id: int,
    db: DBSession,
    user: User = Depends(_owner),
):
    return await OwnerService(db).reject_booking_request(user, booking_id)


@router.get("/stats/summary", response_model=OwnerStatsSummary)
async def stats_summary(db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).stats_summary(user)


@router.get("/notifications", response_model=list[BroadcastOut])
async def list_notifications(db: DBSession, user: User = Depends(_owner)):
    stmt = (
        select(Broadcast)
        .where(
            Broadcast.audience.in_(
                [BroadcastAudience.FIELD_OWNERS, BroadcastAudience.ALL]
            )
        )
        .order_by(Broadcast.created_at.desc())
        .limit(100)
    )
    return list((await db.execute(stmt)).scalars().all())

@router.get("/subscription-payments", response_model=list[SubscriptionPaymentOut])
async def list_subscription_payments(db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).list_subscription_payments(user)


@router.post("/subscription-payments", response_model=SubscriptionPaymentOut, status_code=status.HTTP_201_CREATED)
async def create_subscription_payment(
    body: SubscriptionPaymentCreate,
    db: DBSession,
    user: User = Depends(_owner),
):
    return await OwnerService(db).create_subscription_payment(user, body.amount, body.receipt_image)
