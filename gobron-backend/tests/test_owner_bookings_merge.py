"""Self-checks for the owner's unified bookings feed + stats query shapes.

No live DB: a fake session compiles each statement (so a malformed join or
filter fails here) and returns empty rows.
"""
from datetime import date

import pytest

from app.services.owner_service import OwnerService


class _Rows:
    def all(self):
        return []

    def scalar_one(self):
        return 0

    def scalars(self):
        return self

    def unique(self):
        return self


class FakeCompilingDB:
    async def execute(self, stmt):
        stmt.compile(compile_kwargs={"literal_binds": True})
        return _Rows()


def _service() -> OwnerService:
    service = OwnerService.__new__(OwnerService)
    service.db = FakeCompilingDB()
    return service


@pytest.mark.asyncio
async def test_sum_revenue_compiles_across_both_booking_tables():
    assert await _service()._sum_revenue(1, date(2026, 7, 1), date(2026, 7, 31)) == 0


@pytest.mark.asyncio
async def test_count_bookings_compiles_across_both_booking_tables():
    assert await _service()._count_bookings(1, date(2026, 7, 1), date(2026, 7, 31)) == 0


@pytest.mark.asyncio
async def test_top_field_name_compiles_and_handles_no_rows():
    assert await _service()._top_field_name(1, date(2026, 7, 1), date(2026, 7, 31)) is None


def test_earned_player_period_excludes_pending_and_cancelled():
    """A player booking is only revenue once the owner accepts it, unlike a
    manual booking which the owner typed in themselves.
    """
    clause = _service()._earned_player_booking_period(1, date(2026, 7, 1), date(2026, 7, 31))
    sql = str(clause.compile(compile_kwargs={"literal_binds": True}))
    assert "CONFIRMED" in sql.upper() or "confirmed" in sql
    assert "PENDING" not in sql.upper()
