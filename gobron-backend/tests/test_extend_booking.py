"""Self-checks for extending an in-progress booking."""
from datetime import date, datetime, time
from decimal import Decimal

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.owner import ExtendBookingIn
from app.services.owner_service import OwnerService


def _now(hh: int, mm: int = 0, day: date = date(2026, 7, 9)) -> datetime:
    return datetime.combine(day, time(hh, mm))


TODAY = date(2026, 7, 9)


def test_in_progress_accepts_a_booking_happening_right_now():
    OwnerService._assert_in_progress(TODAY, time(8, 0), time(9, 0), _now(8, 30))
    # Inclusive at the start, exclusive at the end.
    OwnerService._assert_in_progress(TODAY, time(8, 0), time(9, 0), _now(8, 0))


@pytest.mark.parametrize(
    "now",
    [_now(7, 59), _now(9, 0), _now(10, 0)],
    ids=["before it starts", "the moment it ends", "after it ended"],
)
def test_in_progress_rejects_anything_not_happening_now(now):
    with pytest.raises(HTTPException) as exc:
        OwnerService._assert_in_progress(TODAY, time(8, 0), time(9, 0), now)
    assert exc.value.status_code == 409


def test_in_progress_rejects_another_day_at_the_same_clock_time():
    with pytest.raises(HTTPException):
        OwnerService._assert_in_progress(
            date(2026, 7, 10), time(8, 0), time(9, 0), _now(8, 30)
        )


def test_half_an_hour_costs_half_the_slot():
    assert OwnerService._prorate(Decimal("200000"), 30) == Decimal("100000.00")
    assert OwnerService._prorate(Decimal("200000"), 60) == Decimal("200000.00")
    # Odd prices still land on two decimals rather than a long float tail.
    assert OwnerService._prorate(Decimal("150000"), 30) == Decimal("75000.00")


def test_only_30_or_60_minutes_are_accepted():
    for bad in (0, 15, 45, 90, -30):
        with pytest.raises(ValidationError):
            ExtendBookingIn(source="player", booking_id=1, minutes=bad)
    assert ExtendBookingIn(source="player", booking_id=1, minutes=30).minutes == 30
    assert ExtendBookingIn(source="manual", booking_id=1, minutes=60).minutes == 60
