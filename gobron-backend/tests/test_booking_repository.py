"""Self-check: bookings whose slot ended get resolved, not left hanging."""
import pytest

from app.repositories.booking_repository import BookingRepository


class _EmptyScalars:
    def all(self):
        return []


class _Result:
    def scalars(self):
        return _EmptyScalars()


class FakeCompilingDB:
    """Records every statement's SQL instead of running it."""

    def __init__(self, expired_slot_ids: list[int] | None = None):
        self.statements: list[str] = []
        self._expired = expired_slot_ids or []

    async def execute(self, stmt):
        self.statements.append(str(stmt.compile(compile_kwargs={"literal_binds": True})))
        result = _Result()
        result.scalars = lambda: type("S", (), {"all": lambda _s=None: self._expired})()
        return result

    async def commit(self):
        pass


def _find(statements: list[str], prefix: str) -> list[str]:
    return [s for s in statements if s.startswith(prefix)]


@pytest.mark.asyncio
async def test_confirmed_bookings_whose_slot_ended_become_completed():
    db = FakeCompilingDB()
    await BookingRepository(db).settle_finished_bookings()

    completes = [s for s in _find(db.statements, "UPDATE bookings") if "COMPLETED" in s]
    assert len(completes) == 1
    sql = completes[0]
    assert "bookings.status = 'CONFIRMED'" in sql
    assert "slots.end_time <=" in sql
    assert "slots.slot_date <" in sql


@pytest.mark.asyncio
async def test_pending_requests_for_a_passed_slot_are_cancelled_and_free_the_slot():
    """The owner never answered; the game is over, so stop offering
    accept/reject and hand the slot back."""
    db = FakeCompilingDB(expired_slot_ids=[11, 12])
    await BookingRepository(db).settle_finished_bookings()

    cancels = [s for s in _find(db.statements, "UPDATE bookings") if "CANCELLED" in s]
    assert len(cancels) == 1
    assert "bookings.status = 'PENDING'" in cancels[0]

    releases = _find(db.statements, "UPDATE slots")
    assert len(releases) == 1
    assert "AVAILABLE" in releases[0]
    assert "slots.status = 'BOOKED'" in releases[0]


@pytest.mark.asyncio
async def test_nothing_expired_means_no_slot_writes():
    db = FakeCompilingDB(expired_slot_ids=[])
    await BookingRepository(db).settle_finished_bookings()

    assert _find(db.statements, "UPDATE slots") == []
