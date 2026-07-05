"""Slot schemas — read model + manual creation / generation requests."""
from datetime import date, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SlotStatus


class SlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    field_id: int
    slot_date: date
    start_time: time
    end_time: time
    status: SlotStatus
    price: Decimal


class GenerateSlotsRequest(BaseModel):
    """Auto-generate a rolling window of slots for a field."""
    days_ahead: int = Field(14, ge=1, le=90)


class ManualSlotCreate(BaseModel):
    slot_date: date
    start_time: time
    end_time: time
    price: Decimal | None = None
