import pytest

from app.main import app
from app.models.enums import UserRole
from app.models.user import User
from app.services.auth_service import AuthError, AuthService


class FakeUsers:
    def __init__(self, existing: User | None = None):
        self.existing = existing
        self.created: User | None = None

    async def get_by_phone(self, phone: str) -> User | None:
        return self.existing

    async def create_field_owner_by_phone(
        self, phone: str, full_name: str, hashed_password: str | None = None
    ) -> User:
        parts = full_name.strip().split(maxsplit=1)
        self.created = User(
            id=123,
            phone=phone,
            first_name=parts[0],
            last_name=parts[1] if len(parts) > 1 else None,
            hashed_password=hashed_password,
            role=UserRole.FIELD_OWNER,
            is_active=True,
            is_blocked=False,
            is_onboarded=True,
        )
        return self.created


class FakeDB:
    def __init__(self):
        self.commits = 0

    async def commit(self):
        self.commits += 1


def make_service(users: FakeUsers, db: FakeDB) -> AuthService:
    service = AuthService.__new__(AuthService)
    service.users = users
    service.db = db
    return service


@pytest.mark.asyncio
async def test_phone_login_creates_field_owner_for_new_phone():
    users = FakeUsers()
    db = FakeDB()
    service = make_service(users, db)

    tokens = await service.login_with_phone("+998901110011", "Ali Valiyev")

    assert tokens["access_token"]
    assert tokens["refresh_token"]
    assert users.created is not None
    assert users.created.role == UserRole.FIELD_OWNER
    assert users.created.first_name == "Ali"
    assert users.created.last_name == "Valiyev"
    assert users.created.is_onboarded is True
    assert db.commits == 1


@pytest.mark.asyncio
async def test_phone_login_requires_name_for_new_phone():
    service = make_service(FakeUsers(), FakeDB())

    with pytest.raises(AuthError, match="full_name"):
        await service.login_with_phone("+998902220022")


@pytest.mark.asyncio
async def test_phone_login_reuses_existing_phone():
    existing = User(
        id=456,
        phone="+998903330033",
        role=UserRole.FIELD_OWNER,
        is_active=True,
        is_blocked=False,
    )
    users = FakeUsers(existing)
    db = FakeDB()
    service = make_service(users, db)

    tokens = await service.login_with_phone("+998903330033")

    assert tokens["access_token"]
    assert users.created is None
    assert db.commits == 1


@pytest.mark.asyncio
async def test_phone_login_rejects_blocked_user():
    existing = User(
        id=789,
        phone="+998904440044",
        role=UserRole.FIELD_OWNER,
        is_active=True,
        is_blocked=True,
    )
    service = make_service(FakeUsers(existing), FakeDB())

    with pytest.raises(AuthError, match="bloklangan"):
        await service.login_with_phone("+998904440044")


def test_owner_models_are_registered():
    from app.models.field import Field
    from app.models.manual_booking import ManualBooking
    from app.models.venue import Venue

    assert Venue.__tablename__ == "venues"
    assert ManualBooking.__tablename__ == "manual_bookings"
    assert hasattr(Field, "venue_id")
    assert hasattr(Field, "size")
    assert hasattr(Field, "surface_type")
    assert hasattr(Field, "price_per_hour")


def test_owner_router_exposes_venue_route():
    paths = {route.path for route in app.routes}

    assert "/api/v1/owner/venue" in paths


def test_time_ranges_overlap_detects_conflicts():
    from datetime import time

    from app.services.owner_service import time_ranges_overlap

    assert time_ranges_overlap(time(10, 0), time(11, 0), time(10, 30), time(11, 30))
    assert time_ranges_overlap(time(10, 0), time(11, 0), time(9, 30), time(10, 30))
    assert not time_ranges_overlap(time(10, 0), time(11, 0), time(11, 0), time(12, 0))
    assert not time_ranges_overlap(time(10, 0), time(11, 0), time(8, 0), time(10, 0))


class FakeOwnerDB:
    """Returns queued execute() results in call order; add/commit/refresh are no-ops."""

    def __init__(self, results):
        self._results = list(results)

    async def execute(self, _stmt):
        value = self._results.pop(0)
        return type("Result", (), {"scalar_one_or_none": lambda self=None: value})()

    def add(self, _obj):
        pass

    async def commit(self):
        pass

    async def refresh(self, _obj):
        pass


def _make_owner_service(results) -> "OwnerService":
    from app.services.owner_service import OwnerService

    service = OwnerService.__new__(OwnerService)
    service.db = FakeOwnerDB(results)
    return service


@pytest.mark.asyncio
async def test_create_field_copies_address_and_coordinates_from_venue():
    from app.models.venue import Venue
    from app.schemas.owner import OwnerFieldIn

    venue = Venue(id=1, owner_id=9, address="Toshkent, Chilonzor", latitude=41.28, longitude=69.20)
    service = _make_owner_service(results=[venue])  # _get_venue
    # is_active=False short-circuits generate_daily_slots (tested separately
    # below) so this fake DB doesn't also need to answer slot queries.
    body = OwnerFieldIn(name="Maydon 1", price_per_hour="100000", is_active=False)

    field = await service.create_field(owner=User(id=9), body=body)

    assert field.address == "Toshkent, Chilonzor"
    assert field.latitude == 41.28
    assert field.longitude == 69.20


@pytest.mark.asyncio
async def test_update_field_takes_address_and_coordinates_from_the_form():
    """Location is per-field now; editing a field no longer resets it to the
    venue's address."""
    from app.models.field import Field
    from app.schemas.owner import OwnerFieldIn

    field = Field(id=5, owner_id=9, venue_id=1, address="Eski manzil", latitude=1.0, longitude=2.0)
    # _get_owned_field, then the prune DELETE that runs before regeneration.
    service = _make_owner_service(results=[field, None])
    # is_active=False short-circuits generate_daily_slots (tested separately
    # below) so this fake DB doesn't also need to answer slot queries.
    body = OwnerFieldIn(
        name="Maydon 1",
        price_per_hour="100000",
        is_active=False,
        address="Samarqand, Registon",
        latitude=39.65,
        longitude=66.97,
    )

    updated = await service.update_field(owner=User(id=9), field_id=5, body=body)

    assert updated.address == "Samarqand, Registon"
    assert updated.latitude == 39.65
    assert updated.longitude == 66.97


@pytest.mark.asyncio
async def test_create_field_generates_slots_for_active_field(monkeypatch):
    from app.models.venue import Venue
    from app.schemas.owner import OwnerFieldIn
    import app.services.owner_service as owner_service_module

    calls = []

    class FakeSlotService:
        def __init__(self, db):
            pass

        async def generate_daily_slots(self, field, days_ahead):
            calls.append((field, days_ahead))

    monkeypatch.setattr(owner_service_module, "SlotService", FakeSlotService)

    venue = Venue(id=1, owner_id=9, address=None, latitude=None, longitude=None)
    service = _make_owner_service(results=[venue])  # _get_venue
    body = OwnerFieldIn(name="Maydon 1", price_per_hour="100000", booking_window_days=10)

    field = await service.create_field(owner=User(id=9), body=body)

    assert len(calls) == 1
    # 10 bookable days *including today* -> 9 days ahead of today.
    assert calls[0] == (field, 9)


@pytest.mark.asyncio
async def test_single_day_window_generates_today_only(monkeypatch):
    from app.models.venue import Venue
    from app.schemas.owner import OwnerFieldIn
    import app.services.owner_service as owner_service_module

    calls = []

    class FakeSlotService:
        def __init__(self, db):
            pass

        async def generate_daily_slots(self, field, days_ahead):
            calls.append(days_ahead)

    monkeypatch.setattr(owner_service_module, "SlotService", FakeSlotService)

    venue = Venue(id=1, owner_id=9, address=None, latitude=None, longitude=None)
    service = _make_owner_service(results=[venue])
    body = OwnerFieldIn(name="Maydon 1", price_per_hour="100000", booking_window_days=1)

    await service.create_field(owner=User(id=9), body=body)

    assert calls == [0]  # today only, never a negative range


def test_manual_booking_status_binds_lowercase_enum_values():
    from sqlalchemy.dialects import postgresql

    from app.models.enums import ManualBookingStatus
    from app.models.manual_booking import ManualBooking

    status_type = ManualBooking.__table__.c.status.type
    bind_processor = status_type.bind_processor(postql_dialect := postgresql.dialect())

    assert bind_processor is not None
    assert bind_processor(ManualBookingStatus.BOOKED) == "booked"
    assert status_type.result_processor(postql_dialect, None)("booked") == ManualBookingStatus.BOOKED
