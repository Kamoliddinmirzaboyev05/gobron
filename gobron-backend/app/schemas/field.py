"""Field schemas — create/update/read for football fields."""
from datetime import datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FieldBase(BaseModel):
    name: str = Field(..., max_length=150)
    description: str | None = None
    address: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=20)
    latitude: float | None = None
    longitude: float | None = None
    images: list[str] = []

    opening_time: time = time(8, 0)
    closing_time: time = time(23, 0)
    slot_duration: int = 60
    working_days: list[int] = [0, 1, 2, 3, 4, 5, 6]

    price_per_slot: Decimal = Decimal("0")
    peak_start_time: time | None = None
    peak_price_multiplier: Decimal = Decimal("1.0")
    is_active: bool = True

    @field_validator("slot_duration")
    @classmethod
    def _valid_duration(cls, v: int) -> int:
        if v not in (30, 60):
            raise ValueError("slot_duration must be 30 or 60")
        return v

    @field_validator("working_days")
    @classmethod
    def _valid_days(cls, v: list[int]) -> list[int]:
        if any(d < 0 or d > 6 for d in v):
            raise ValueError("working_days must be integers 0..6 (Mon..Sun)")
        return sorted(set(v))


class FieldCreate(FieldBase):
    pass


class FieldUpdate(BaseModel):
    """All fields optional for PATCH-style updates."""
    name: str | None = None
    description: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    images: list[str] | None = None
    opening_time: time | None = None
    closing_time: time | None = None
    slot_duration: int | None = None
    working_days: list[int] | None = None
    price_per_slot: Decimal | None = None
    peak_start_time: time | None = None
    peak_price_multiplier: Decimal | None = None
    is_active: bool | None = None


class FieldOut(FieldBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    rating: float
    # How many days ahead the owner lets players book (1 = today only).
    booking_window_days: int
    created_at: datetime
