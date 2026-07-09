"""Self-check: confirmed bookings whose slot ended become COMPLETED."""
import pytest

from app.repositories.booking_repository import BookingRepository


class FakeCompilingDB:
    def __init__(self):
        self.sql = ""

    async def execute(self, stmt):
        self.sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        return None

    async def commit(self):
        pass


@pytest.mark.asyncio
async def test_settle_updates_only_confirmed_bookings_whose_slot_ended():
    db = FakeCompilingDB()
    await BookingRepository(db).settle_finished_bookings()

    sql = db.sql
    assert sql.startswith("UPDATE bookings")
    assert "SET status='COMPLETED'" in sql or "status='COMPLETED'" in sql
    # Only confirmed ones, and only slots already finished.
    assert "bookings.status = 'CONFIRMED'" in sql
    assert "slots.end_time <=" in sql
    assert "slots.slot_date <" in sql
