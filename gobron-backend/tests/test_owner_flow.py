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

    async def create_field_owner_by_phone(self, phone: str, full_name: str) -> User:
        parts = full_name.strip().split(maxsplit=1)
        self.created = User(
            id=123,
            phone=phone,
            first_name=parts[0],
            last_name=parts[1] if len(parts) > 1 else None,
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
