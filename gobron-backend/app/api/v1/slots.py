"""Slot endpoints — public availability + owner generation/manual/block."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import User
from app.core.deps import DBSession, require_role
from app.models.enums import UserRole
from app.repositories.field_repository import FieldRepository
from app.repositories.slot_repository import SlotRepository
from app.schemas.slot import (
    GenerateSlotsRequest,
    ManualSlotCreate,
    SlotOut,
)
from app.services.slot_service import SlotService

router = APIRouter(tags=["slots"])

_owner_or_admin = require_role(UserRole.FIELD_OWNER, UserRole.SUPERADMIN)


async def _owned_field(field_id: int, db, user):
    field = await FieldRepository(db).get(field_id)
    if field is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Field not found")
    if user.role != UserRole.SUPERADMIN and field.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your field")
    return field


@router.get("/fields/{field_id}/slots", response_model=list[SlotOut])
async def list_slots(
    field_id: int,
    db: DBSession,
    on_date: date | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    available_only: bool = True,
):
    """Public: the calendar reads available slots for a field/date range."""
    return await SlotRepository(db).list_for_field(
        field_id,
        on_date=on_date,
        date_from=date_from,
        date_to=date_to,
        available_only=available_only,
    )


@router.post("/fields/{field_id}/slots/generate", response_model=list[SlotOut])
async def generate_slots(
    field_id: int,
    body: GenerateSlotsRequest,
    db: DBSession,
    user: User = Depends(_owner_or_admin),
):
    field = await _owned_field(field_id, db, user)
    slots = await SlotService(db).generate_daily_slots(field, body.days_ahead)
    await db.commit()
    return slots


@router.post(
    "/fields/{field_id}/slots",
    response_model=SlotOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_manual_slot(
    field_id: int,
    body: ManualSlotCreate,
    db: DBSession,
    user: User = Depends(_owner_or_admin),
):
    field = await _owned_field(field_id, db, user)
    slot = await SlotService(db).add_manual_slot(
        field, body.slot_date, body.start_time, body.end_time, body.price
    )
    await db.commit()
    await db.refresh(slot)
    return slot


@router.post("/slots/{slot_id}/block", response_model=SlotOut)
async def block_slot(
    slot_id: int, db: DBSession, user: User = Depends(_owner_or_admin)
):
    try:
        slot = await SlotService(db).block_slot(slot_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    await db.commit()
    return slot


@router.post("/slots/{slot_id}/unblock", response_model=SlotOut)
async def unblock_slot(
    slot_id: int, db: DBSession, user: User = Depends(_owner_or_admin)
):
    try:
        slot = await SlotService(db).unblock_slot(slot_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    await db.commit()
    return slot
