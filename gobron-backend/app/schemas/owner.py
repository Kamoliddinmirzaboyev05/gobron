"""Owner-scoped schemas for the Flutter admin app."""
from datetime import date, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ManualBookingStatus


class VenueIn(BaseModel):
    name: str = Field(..., max_length=150)
    address: str | None = Field(None, max_length=255)
    landmark: str | None = Field(None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    opening_time: time
    closing_time: time
    working_days: list[int] = [0, 1, 2, 3, 4, 5, 6]
    is_active: bool = True

    @field_validator("working_days")
    @classmethod
    def _valid_days(cls, value: list[int]) -> list[int]:
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("working_days must be 0..6")
        return sorted(set(value))


class VenueOut(VenueIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int


class OwnerFieldIn(BaseModel):
    name: str = Field(..., max_length=150)
    size: str | None = Field(None, max_length=40)
    surface_type: str = Field("open", pattern="^(open|covered)$")
    price_per_hour: Decimal
    images: list[str] = []
    is_active: bool = True


class OwnerFieldOut(OwnerFieldIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    venue_id: int


class ManualBookingCreate(BaseModel):
    field_id: int
    booking_date: date
    start_time: time
    end_time: time
    customer_name: str | None = Field(None, max_length=120)
    customer_phone: str | None = Field(None, max_length=20)
    price: Decimal
    note: str | None = None


class ManualBookingUpdate(BaseModel):
    booking_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    customer_name: str | None = Field(None, max_length=120)
    customer_phone: str | None = Field(None, max_length=20)
    price: Decimal | None = None
    note: str | None = None


class ManualBookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    field_id: int
    booking_date: date
    start_time: time
    end_time: time
    customer_name: str | None
    customer_phone: str | None
    price: Decimal
    note: str | None
    status: ManualBookingStatus


class OwnerStatsSummary(BaseModel):
    today_revenue: Decimal
    weekly_revenue: Decimal
    monthly_revenue: Decimal
    today_booking_count: int
    weekly_booking_count: int
    monthly_booking_count: int
    top_field_name: str | None
