"""Cancel lead-time policy and rate limiter unit checks."""
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest

from app.models.enums import SlotStatus
from app.models.slot import Slot
from app.services.booking_service import BookingService, SlotUnavailableError
from app.utils.rate_limit import RateLimiter


def _slot(day: date, start: str = "12:00", end: str = "13:00") -> Slot:
    h1, m1 = map(int, start.split(":"))
    h2, m2 = map(int, end.split(":"))
    return Slot(
        id=1,
        field_id=1,
        slot_date=day,
        start_time=time(h1, m1),
        end_time=time(h2, m2),
        status=SlotStatus.BOOKED,
        price=Decimal("100000"),
    )


def test_cancel_allowed_when_kickoff_is_far():
    day = date(2030, 1, 15)
    slot = _slot(day, "18:00", "19:00")
    fake_now = datetime(2030, 1, 15, 10, 0)  # 8h lead
    with patch("app.services.booking_service.now_local", return_value=fake_now):
        BookingService._assert_cancellable(slot)  # no raise


def test_cancel_blocked_within_lead_window():
    day = date(2030, 1, 15)
    slot = _slot(day, "12:00", "13:00")
    fake_now = datetime(2030, 1, 15, 11, 30)  # 30 min lead
    with patch("app.services.booking_service.now_local", return_value=fake_now):
        with pytest.raises(SlotUnavailableError, match="bekor"):
            BookingService._assert_cancellable(slot)


def test_rate_limiter_blocks_after_limit():
    lim = RateLimiter()
    assert lim.allow("k", limit=2, window_seconds=60)
    assert lim.allow("k", limit=2, window_seconds=60)
    assert not lim.allow("k", limit=2, window_seconds=60)
