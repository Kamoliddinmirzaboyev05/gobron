"""Self-checks for BookingService._contiguous_slots (no DB needed)."""
from datetime import date, time
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.enums import SlotStatus
from app.models.slot import Slot
from app.repositories.slot_repository import SlotRepository
from app.schemas.booking import BookingCreate
from app.services.booking_service import BookingService, SlotUnavailableError


def _slot(
    start: str, end: str, *, id: int = 1, field_id: int = 1, day: date = date(2026, 7, 9)
) -> Slot:
    h1, m1 = map(int, start.split(":"))
    h2, m2 = map(int, end.split(":"))
    return Slot(
        id=id,
        field_id=field_id,
        slot_date=day,
        start_time=time(h1, m1),
        end_time=time(h2, m2),
        status=SlotStatus.AVAILABLE,
        price=Decimal("100000"),
    )


def _service() -> BookingService:
    return BookingService.__new__(BookingService)


class _EmptyResult:
    def scalar_one_or_none(self):
        return None


class FakeBookingDB:
    """Just enough of an AsyncSession for create_booking's ONCE/multi-slot path."""

    def add(self, _obj):
        pass

    async def commit(self):
        pass

    async def refresh(self, _obj):
        pass

    async def execute(self, _stmt):
        # No manual bookings in unit tests.
        return _EmptyResult()


@pytest.mark.asyncio
async def test_create_booking_populates_slot_without_further_db_access():
    """Regression test: BookingOut reads booking.slot during response
    serialization. If that's an unloaded lazy relationship, FastAPI crashes
    with MissingGreenlet - even though the booking already committed fine.
    create_booking must attach .slot in memory so no further I/O is needed.
    """
    a, b = _slot("11:00", "12:00", id=101), _slot("12:00", "13:00", id=102)

    service = BookingService.__new__(BookingService)
    service.db = FakeBookingDB()
    service.slots = SlotRepository.__new__(SlotRepository)
    service.slots.db = service.db

    async def get_many(slot_ids):
        return [s for s in [a, b] if s.id in slot_ids]

    service.slots.get_many = get_many

    bookings = await service.create_booking(user_id=1, slot_ids=[101, 102])

    assert len(bookings) == 2
    assert bookings[0].slot is a
    assert bookings[1].slot is b
    assert bookings[0].recurrence_group_id == bookings[1].recurrence_group_id


def test_single_slot_is_trivially_contiguous():
    service = _service()
    result = service._contiguous_slots([_slot("11:00", "12:00")])
    assert [s.start_time for s in result] == [time(11, 0)]


def test_back_to_back_slots_are_contiguous_in_any_input_order():
    service = _service()
    a, b, c = _slot("11:00", "12:00"), _slot("12:00", "13:00"), _slot("13:00", "14:00")
    result = service._contiguous_slots([c, a, b])
    assert [s.start_time for s in result] == [time(11, 0), time(12, 0), time(13, 0)]


def test_a_block_crossing_midnight_is_contiguous():
    """23:00-00:00 tonight runs straight into 00:00-01:00 tomorrow."""
    service = _service()
    late = _slot("23:00", "00:00", id=1, day=date(2026, 7, 9))
    early = _slot("00:00", "01:00", id=2, day=date(2026, 7, 10))

    result = service._contiguous_slots([early, late])

    assert [s.id for s in result] == [1, 2]


def test_same_clock_times_on_the_wrong_days_are_rejected():
    service = _service()
    late = _slot("23:00", "00:00", day=date(2026, 7, 9))
    early = _slot("00:00", "01:00", day=date(2026, 7, 12))
    with pytest.raises(SlotUnavailableError):
        service._contiguous_slots([late, early])


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
