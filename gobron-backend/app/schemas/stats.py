"""Statistics / reporting schemas."""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class RevenuePoint(BaseModel):
    day: date
    revenue: Decimal
    bookings: int


class PopularSlot(BaseModel):
    start_time: str  # "HH:MM"
    bookings: int


class DashboardStats(BaseModel):
    total_revenue: Decimal
    total_bookings: int
    active_fields: int
    occupancy_rate: float  # 0..1, booked slots / total slots in range
    revenue_series: list[RevenuePoint]
    popular_slots: list[PopularSlot]
