"""Self-checks for who may rate a booking and how the field average updates."""
import pytest
from pydantic import ValidationError

from app.models.booking import Booking
from app.models.enums import BookingStatus
from app.models.field import Field
from app.schemas.booking import RatingIn
from app.services.review_service import ReviewError, ReviewService


class FakeDB:
    """Serves db.get() from a dict; execute() returns queued scalar results."""

    def __init__(self, objects: dict, scalars: list):
        self.objects = objects
        self.scalars = list(scalars)
        self.added = []

    async def get(self, model, pk):
        return self.objects.get((model, pk))

    async def execute(self, _stmt):
        value = self.scalars.pop(0)
        return type(
            "R", (), {"scalar_one": lambda s=None: value, "scalar_one_or_none": lambda s=None: value}
        )()

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        pass

    async def commit(self):
        pass

    async def refresh(self, _obj):
        pass


def _service(db) -> ReviewService:
    service = ReviewService.__new__(ReviewService)
    service.db = db
    return service


@pytest.mark.asyncio
async def test_cannot_rate_someone_elses_booking():
    booking = Booking(id=1, user_id=99, slot_id=5, status=BookingStatus.CONFIRMED)
    db = FakeDB({(Booking, 1): booking}, scalars=[])
    with pytest.raises(ReviewError):
        await _service(db).rate_booking(user_id=1, booking_id=1, rating=5)


@pytest.mark.asyncio
async def test_cannot_rate_a_pending_booking():
    booking = Booking(id=1, user_id=1, slot_id=5, status=BookingStatus.PENDING)
    db = FakeDB({(Booking, 1): booking}, scalars=[])
    with pytest.raises(ReviewError):
        await _service(db).rate_booking(user_id=1, booking_id=1, rating=5)


@pytest.mark.asyncio
async def test_rating_a_confirmed_booking_updates_the_field_average():
    booking = Booking(id=1, user_id=1, slot_id=5, status=BookingStatus.CONFIRMED)
    field = Field(id=7, rating=0.0)
    db = FakeDB(
        {(Booking, 1): booking, (Field, 7): field},
        # field_id lookup, existing-review lookup, then the recomputed average
        scalars=[7, None, 4.5],
    )

    review = await _service(db).rate_booking(user_id=1, booking_id=1, rating=5)

    assert review.rating == 5
    assert review.field_id == 7
    assert field.rating == 4.5


@pytest.mark.asyncio
async def test_re_rating_overwrites_instead_of_inserting():
    from app.models.review import Review

    booking = Booking(id=1, user_id=1, slot_id=5, status=BookingStatus.CONFIRMED)
    field = Field(id=7, rating=5.0)
    existing = Review(id=3, booking_id=1, user_id=1, field_id=7, rating=5)
    db = FakeDB({(Booking, 1): booking, (Field, 7): field}, scalars=[7, existing, 2.0])

    review = await _service(db).rate_booking(user_id=1, booking_id=1, rating=2)

    assert review is existing
    assert review.rating == 2
    assert db.added == []  # no second row for the same booking
    assert field.rating == 2.0


def test_rating_must_be_between_one_and_five():
    for bad in (0, 6, -1):
        with pytest.raises(ValidationError):
            RatingIn(rating=bad)
    assert RatingIn(rating=1).rating == 1
    assert RatingIn(rating=5).rating == 5
