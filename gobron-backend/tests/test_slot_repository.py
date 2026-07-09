"""Self-check: `available_only` must also mean "not already started"."""
from datetime import date, datetime

import pytest

from app.repositories.slot_repository import SlotRepository


class _Scalars:
    def all(self):
        return []


class _Result:
    def scalars(self):
        return _Scalars()


class FakeCompilingDB:
    """Captures the compiled SQL instead of running it."""

    def __init__(self):
        self.sql = ""

    async def execute(self, stmt):
        self.sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        return _Result()


@pytest.mark.asyncio
async def test_available_only_excludes_slots_that_already_started_today():
    db = FakeCompilingDB()
    await SlotRepository(db).list_for_field(1, on_date=date.today(), available_only=True)

    # The now-cutoff appears as a date comparison OR (same-day AND time >).
    assert "slots.start_time >" in db.sql
    assert str(datetime.now().date()) in db.sql


@pytest.mark.asyncio
async def test_without_available_only_no_time_cutoff_is_applied():
    """The owner/admin panel lists past slots too - only the bookable view filters."""
    db = FakeCompilingDB()
    await SlotRepository(db).list_for_field(1, on_date=date.today(), available_only=False)

    assert "slots.start_time >" not in db.sql
