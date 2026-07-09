"""Self-checks for BookingService._contiguous_slots (no DB needed)."""
from datetime import date, time

import pytest
from pydantic import ValidationError

from app.models.slot import Slot
from app.schemas.booking import BookingCreate
from app.services.booking_service import BookingService, SlotUnavailableError


def _slot(start: str, end: str, field_id: int = 1, day: date = date(2026, 7, 9)) -> Slot:
    h1, m1 = map(int, start.split(":"))
    h2, m2 = map(int, end.split(":"))
    return Slot(field_id=field_id, slot_date=day, start_time=time(h1, m1), end_time=time(h2, m2))


def _service() -> BookingService:
    return BookingService.__new__(BookingService)


def test_single_slot_is_trivially_contiguous():
    service = _service()
    result = service._contiguous_slots([_slot("11:00", "12:00")])
    assert [s.start_time for s in result] == [time(11, 0)]


def test_back_to_back_slots_are_contiguous_in_any_input_order():
    service = _service()
    a, b, c = _slot("11:00", "12:00"), _slot("12:00", "13:00"), _slot("13:00", "14:00")
    result = service._contiguous_slots([c, a, b])
    assert [s.start_time for s in result] == [time(11, 0), time(12, 0), time(13, 0)]


def test_gap_between_slots_is_rejected():
    service = _service()
    with pytest.raises(SlotUnavailableError):
        service._contiguous_slots([_slot("11:00", "12:00"), _slot("15:00", "16:00")])


def test_different_field_is_rejected():
    service = _service()
    with pytest.raises(SlotUnavailableError):
        service._contiguous_slots([
            _slot("11:00", "12:00", field_id=1),
            _slot("12:00", "13:00", field_id=2),
        ])


def test_different_date_is_rejected():
    service = _service()
    with pytest.raises(SlotUnavailableError):
        service._contiguous_slots([
            _slot("11:00", "12:00", day=date(2026, 7, 9)),
            _slot("12:00", "13:00", day=date(2026, 7, 10)),
        ])


def test_recurring_booking_rejects_multiple_slot_ids():
    with pytest.raises(ValidationError):
        BookingCreate(slot_ids=[1, 2], recurrence_type="daily", occurrences=4)


def test_once_booking_allows_multiple_slot_ids():
    body = BookingCreate(slot_ids=[1, 2, 3])
    assert body.slot_ids == [1, 2, 3]
