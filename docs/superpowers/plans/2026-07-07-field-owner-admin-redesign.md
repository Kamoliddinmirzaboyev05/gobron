# Field Owner Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the field-owner operational flow: phone login, venue settings, field management, manual booking, and revenue stats.

**Architecture:** Add owner-scoped backend APIs around `Venue`, updated `Field`, and `ManualBooking`, then wire the Flutter admin app to those APIs. Keep existing public user-web and superadmin flows compatible while the new owner flow uses the new domain model.

**Tech Stack:** FastAPI, SQLAlchemy async, Alembic, Pydantic v2, PyJWT, Flutter, Riverpod, GoRouter, Dio.

## Global Constraints

- Support one venue per owner in the first implementation.
- Flutter admin login uses OTP-free phone login for now.
- New phone login creates a `field_owner` user; existing phone logs in.
- Field owners can only access their own venue, fields, bookings, and stats.
- Manual bookings must reject overlapping bookings for the same field and date.
- Keep old field columns temporarily to avoid breaking existing web flows.
- Use `https://gobronapi.webportfolio.uz/api/v1` as the production API base URL.

---

## File Structure

Backend:

- Create `gobron-backend/app/models/venue.py`: venue model and relationship to owner/fields.
- Create `gobron-backend/app/models/manual_booking.py`: owner-created booking model.
- Modify `gobron-backend/app/models/field.py`: add `venue_id`, `size`, `surface_type`, and `price_per_hour`.
- Modify `gobron-backend/app/models/__init__.py`: register new models.
- Create `gobron-backend/alembic/versions/20260707_field_owner_redesign.py`: migration for venues, field columns, and manual bookings.
- Modify `gobron-backend/app/schemas/auth.py`: add phone-login request schema.
- Modify `gobron-backend/app/services/auth_service.py`: add phone-login service.
- Modify `gobron-backend/app/repositories/user_repository.py`: add safe phone create/update helpers.
- Create `gobron-backend/app/schemas/owner.py`: owner API request/response schemas.
- Create `gobron-backend/app/services/owner_service.py`: venue, field, manual booking, stats business logic.
- Create `gobron-backend/app/api/v1/owner.py`: owner-scoped routes.
- Modify `gobron-backend/app/api/v1/router.py`: include owner router.
- Create `gobron-backend/tests/test_owner_flow.py`: backend regression tests for auth, ownership, overlaps, and stats.

Flutter:

- Modify `gobron-flutter-admin/lib/features/auth/auth_repository.dart`: use `/auth/phone-login`.
- Modify `gobron-flutter-admin/lib/features/auth/auth_controller.dart`: phone/full-name login method.
- Modify `gobron-flutter-admin/lib/features/auth/login_screen.dart`: phone-first login UI.
- Create `gobron-flutter-admin/lib/features/venue/models/venue.dart`: venue model.
- Create `gobron-flutter-admin/lib/features/venue/venue_repository.dart`: venue API calls.
- Create `gobron-flutter-admin/lib/features/venue/venue_controller.dart`: Riverpod state.
- Create `gobron-flutter-admin/lib/features/venue/presentation/venue_settings_screen.dart`: venue settings form.
- Modify `gobron-flutter-admin/lib/features/fields/models/field.dart`: new field shape.
- Modify `gobron-flutter-admin/lib/features/fields/fields_repository.dart`: owner field API shape.
- Modify `gobron-flutter-admin/lib/features/fields/presentation/field_form_screen.dart`: name, price, size, surface, images, active.
- Modify `gobron-flutter-admin/lib/features/fields/presentation/fields_list_screen.dart`: show new field summary.
- Create `gobron-flutter-admin/lib/features/manual_bookings/models/manual_booking.dart`: manual booking models.
- Create `gobron-flutter-admin/lib/features/manual_bookings/manual_booking_repository.dart`: booking API calls.
- Create `gobron-flutter-admin/lib/features/manual_bookings/manual_booking_controller.dart`: Riverpod state.
- Create `gobron-flutter-admin/lib/features/manual_bookings/presentation/manual_booking_sheet.dart`: dashboard bottom sheet.
- Modify `gobron-flutter-admin/lib/features/stats/models/dashboard_stats.dart`: owner summary shape.
- Modify `gobron-flutter-admin/lib/features/stats/stats_repository.dart`: use `/owner/stats/summary`.
- Modify `gobron-flutter-admin/lib/features/stats/presentation/stats_screen.dart`: dashboard with floating `+`.
- Modify `gobron-flutter-admin/lib/shell/home_shell.dart`: tabs for dashboard, fields, venue settings.
- Modify `gobron-flutter-admin/lib/core/routing/app_router.dart`: route venue settings and remove slot-only assumptions.

---

### Task 1: Backend Phone Login

**Files:**
- Modify: `gobron-backend/app/schemas/auth.py`
- Modify: `gobron-backend/app/repositories/user_repository.py`
- Modify: `gobron-backend/app/services/auth_service.py`
- Modify: `gobron-backend/app/api/v1/auth.py`
- Test: `gobron-backend/tests/test_owner_flow.py`

**Interfaces:**
- Produces: `PhoneLogin(phone: str, full_name: str | None)`
- Produces: `AuthService.login_with_phone(phone: str, full_name: str | None) -> dict`
- Produces: `POST /api/v1/auth/phone-login`

- [ ] **Step 1: Write backend phone-login tests**

Create `gobron-backend/tests/test_owner_flow.py` with:

```python
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.enums import UserRole
from app.repositories.user_repository import UserRepository


@pytest.mark.asyncio
async def test_phone_login_creates_field_owner():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/phone-login",
            json={"phone": "+998901110011", "full_name": "Ali Valiyev"},
        )
    assert res.status_code == 200
    assert res.json()["access_token"]

    async with AsyncSessionLocal() as db:
        user = await UserRepository(db).get_by_phone("+998901110011")
        assert user is not None
        assert user.role == UserRole.FIELD_OWNER
        assert user.first_name == "Ali"
        assert user.last_name == "Valiyev"
        assert user.is_onboarded is True


@pytest.mark.asyncio
async def test_phone_login_requires_name_for_new_phone():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/phone-login",
            json={"phone": "+998902220022"},
        )
    assert res.status_code == 400
    assert "full_name" in res.json()["detail"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd gobron-backend
pytest tests/test_owner_flow.py -q
```

Expected: FAIL because `/api/v1/auth/phone-login` is not implemented.

- [ ] **Step 3: Add phone-login schema**

In `gobron-backend/app/schemas/auth.py`, add:

```python
class PhoneLogin(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20)
    full_name: str | None = Field(None, min_length=2, max_length=120)
```

- [ ] **Step 4: Add safe phone user helper**

In `gobron-backend/app/repositories/user_repository.py`, add:

```python
async def create_field_owner_by_phone(self, phone: str, full_name: str) -> User:
    parts = full_name.strip().split(maxsplit=1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else None
    user = User(
        phone=phone,
        first_name=first_name,
        last_name=last_name,
        role=UserRole.FIELD_OWNER,
        is_onboarded=True,
    )
    self.db.add(user)
    await self.db.flush()
    return user
```

- [ ] **Step 5: Add auth service method**

In `gobron-backend/app/services/auth_service.py`, add:

```python
async def login_with_phone(self, phone: str, full_name: str | None = None) -> dict:
    user = await self.users.get_by_phone(phone)
    if user is None:
        if not full_name or not full_name.strip():
            raise AuthError("full_name is required for new phone registration")
        user = await self.users.create_field_owner_by_phone(phone, full_name)
    if user.is_blocked or not user.is_active:
        raise AuthError("Hisob bloklangan")
    await self.db.commit()
    return self._tokens(user)
```

- [ ] **Step 6: Add route**

In `gobron-backend/app/api/v1/auth.py`, import `PhoneLogin` and add:

```python
@router.post("/phone-login", response_model=TokenPair)
async def phone_login(body: PhoneLogin, db: DBSession):
    try:
        return await AuthService(db).login_with_phone(body.phone, body.full_name)
    except AuthError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
```

- [ ] **Step 7: Run tests to verify pass**

Run:

```bash
cd gobron-backend
pytest tests/test_owner_flow.py -q
```

Expected: PASS for phone-login tests.

- [ ] **Step 8: Commit**

```bash
git add gobron-backend/app/schemas/auth.py gobron-backend/app/repositories/user_repository.py gobron-backend/app/services/auth_service.py gobron-backend/app/api/v1/auth.py gobron-backend/tests/test_owner_flow.py
git commit -m "feat: add phone login for field owners"
```

---

### Task 2: Backend Venue, Field Extensions, and Manual Booking Models

**Files:**
- Create: `gobron-backend/app/models/venue.py`
- Create: `gobron-backend/app/models/manual_booking.py`
- Modify: `gobron-backend/app/models/field.py`
- Modify: `gobron-backend/app/models/enums.py`
- Modify: `gobron-backend/app/models/__init__.py`
- Create: `gobron-backend/alembic/versions/20260707_field_owner_redesign.py`
- Test: `gobron-backend/tests/test_owner_flow.py`

**Interfaces:**
- Produces: `Venue`
- Produces: `ManualBooking`
- Produces: `ManualBookingStatus`
- Produces: `Field.venue_id`, `Field.size`, `Field.surface_type`, `Field.price_per_hour`

- [ ] **Step 1: Extend tests for model metadata**

Append to `gobron-backend/tests/test_owner_flow.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd gobron-backend
pytest tests/test_owner_flow.py::test_owner_models_are_registered -q
```

Expected: FAIL because modules/classes do not exist.

- [ ] **Step 3: Add enum**

In `gobron-backend/app/models/enums.py`, add:

```python
class ManualBookingStatus(str, Enum):
    BOOKED = "booked"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
```

- [ ] **Step 4: Add Venue model**

Create `gobron-backend/app/models/venue.py`:

```python
from datetime import datetime, time

from sqlalchemy import ARRAY, Boolean, DateTime, ForeignKey, Integer, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Venue(Base):
    __tablename__ = "venues"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    address: Mapped[str | None] = mapped_column(String(255))
    landmark: Mapped[str | None] = mapped_column(String(255))
    latitude: Mapped[float | None] = mapped_column()
    longitude: Mapped[float | None] = mapped_column()
    opening_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(8, 0))
    closing_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(23, 0))
    working_days: Mapped[list[int]] = mapped_column(ARRAY(Integer), default=lambda: [0, 1, 2, 3, 4, 5, 6])
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship()  # noqa: F821
    fields: Mapped[list["Field"]] = relationship(back_populates="venue")  # noqa: F821
```

- [ ] **Step 5: Add ManualBooking model**

Create `gobron-backend/app/models/manual_booking.py`:

```python
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ManualBookingStatus


class ManualBooking(Base):
    __tablename__ = "manual_bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id", ondelete="CASCADE"), index=True)
    booking_date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String(120))
    customer_phone: Mapped[str | None] = mapped_column(String(20))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ManualBookingStatus] = mapped_column(
        Enum(ManualBookingStatus, name="manual_booking_status"),
        default=ManualBookingStatus.BOOKED,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    field: Mapped["Field"] = relationship()  # noqa: F821
```

- [ ] **Step 6: Extend Field model**

In `gobron-backend/app/models/field.py`, add:

```python
venue_id: Mapped[int | None] = mapped_column(ForeignKey("venues.id", ondelete="CASCADE"), index=True)
size: Mapped[str | None] = mapped_column(String(40))
surface_type: Mapped[str] = mapped_column(String(20), default="open", nullable=False)
price_per_hour: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
venue: Mapped["Venue | None"] = relationship(back_populates="fields")  # noqa: F821
```

- [ ] **Step 7: Register models**

In `gobron-backend/app/models/__init__.py`, import:

```python
from app.models.manual_booking import ManualBooking  # noqa: F401
from app.models.venue import Venue  # noqa: F401
```

- [ ] **Step 8: Add migration**

Create `gobron-backend/alembic/versions/20260707_field_owner_redesign.py` with SQLAlchemy operations:

```python
def upgrade() -> None:
    op.create_table(
        "venues",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("landmark", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("opening_time", sa.Time(), nullable=False),
        sa.Column("closing_time", sa.Time(), nullable=False),
        sa.Column("working_days", sa.ARRAY(sa.Integer()), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("owner_id"),
    )
    op.create_index("ix_venues_owner_id", "venues", ["owner_id"])
    op.add_column("fields", sa.Column("venue_id", sa.Integer(), nullable=True))
    op.add_column("fields", sa.Column("size", sa.String(length=40), nullable=True))
    op.add_column("fields", sa.Column("surface_type", sa.String(length=20), nullable=False, server_default="open"))
    op.add_column("fields", sa.Column("price_per_hour", sa.Numeric(10, 2), nullable=False, server_default="0"))
    op.create_index("ix_fields_venue_id", "fields", ["venue_id"])
    op.create_foreign_key("fk_fields_venue_id", "fields", "venues", ["venue_id"], ["id"], ondelete="CASCADE")
    manual_booking_status = sa.Enum("booked", "cancelled", "completed", name="manual_booking_status")
    manual_booking_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "manual_bookings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("field_id", sa.Integer(), nullable=False),
        sa.Column("booking_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("customer_name", sa.String(length=120), nullable=True),
        sa.Column("customer_phone", sa.String(length=20), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", manual_booking_status, nullable=False, server_default="booked"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_manual_bookings_owner_id", "manual_bookings", ["owner_id"])
    op.create_index("ix_manual_bookings_field_id", "manual_bookings", ["field_id"])
    op.create_index("ix_manual_bookings_booking_date", "manual_bookings", ["booking_date"])
```

Also include `downgrade()`:

```python
def downgrade() -> None:
    op.drop_index("ix_manual_bookings_booking_date", table_name="manual_bookings")
    op.drop_index("ix_manual_bookings_field_id", table_name="manual_bookings")
    op.drop_index("ix_manual_bookings_owner_id", table_name="manual_bookings")
    op.drop_table("manual_bookings")
    sa.Enum(name="manual_booking_status").drop(op.get_bind(), checkfirst=True)
    op.drop_constraint("fk_fields_venue_id", "fields", type_="foreignkey")
    op.drop_index("ix_fields_venue_id", table_name="fields")
    op.drop_column("fields", "price_per_hour")
    op.drop_column("fields", "surface_type")
    op.drop_column("fields", "size")
    op.drop_column("fields", "venue_id")
    op.drop_index("ix_venues_owner_id", table_name="venues")
    op.drop_table("venues")
```

- [ ] **Step 9: Run tests**

Run:

```bash
cd gobron-backend
pytest tests/test_owner_flow.py::test_owner_models_are_registered -q
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add gobron-backend/app/models gobron-backend/alembic/versions/20260707_field_owner_redesign.py gobron-backend/tests/test_owner_flow.py
git commit -m "feat: add owner venue and manual booking models"
```

---

### Task 3: Owner API and Business Logic

**Files:**
- Create: `gobron-backend/app/schemas/owner.py`
- Create: `gobron-backend/app/services/owner_service.py`
- Create: `gobron-backend/app/api/v1/owner.py`
- Modify: `gobron-backend/app/api/v1/router.py`
- Test: `gobron-backend/tests/test_owner_flow.py`

**Interfaces:**
- Produces: `OwnerService.get_or_create_venue(owner: User) -> Venue`
- Produces: `OwnerService.create_manual_booking(owner: User, body: ManualBookingCreate) -> ManualBooking`
- Produces: owner routes under `/api/v1/owner`

- [ ] **Step 1: Write API tests for venue, overlap, and stats**

Append tests that:

```python
@pytest.mark.asyncio
async def test_owner_can_create_venue_field_booking_and_stats(owner_token):
    headers = {"Authorization": f"Bearer {owner_token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as client:
        venue = await client.put("/api/v1/owner/venue", json={
            "name": "Champions Arena",
            "address": "Toshkent",
            "landmark": "Metro yonida",
            "opening_time": "08:00:00",
            "closing_time": "23:00:00",
            "working_days": [0, 1, 2, 3, 4, 5, 6],
            "is_active": True,
        })
        assert venue.status_code == 200
        field = await client.post("/api/v1/owner/fields", json={
            "name": "1-maydon",
            "size": "20x30",
            "surface_type": "covered",
            "price_per_hour": "150000.00",
            "images": [],
            "is_active": True,
        })
        assert field.status_code == 201
        booking = await client.post("/api/v1/owner/bookings", json={
            "field_id": field.json()["id"],
            "booking_date": "2026-07-07",
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "customer_name": "Vali",
            "customer_phone": "+998901234567",
            "price": "150000.00",
            "note": "Naqd",
        })
        assert booking.status_code == 201
        overlap = await client.post("/api/v1/owner/bookings", json={
            "field_id": field.json()["id"],
            "booking_date": "2026-07-07",
            "start_time": "10:30:00",
            "end_time": "11:30:00",
            "price": "150000.00",
        })
        assert overlap.status_code == 409
        stats = await client.get("/api/v1/owner/stats/summary")
        assert stats.status_code == 200
        assert stats.json()["monthly_revenue"] >= 150000
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd gobron-backend
pytest tests/test_owner_flow.py -q
```

Expected: FAIL because owner routes are not implemented.

- [ ] **Step 3: Add owner schemas**

Create `gobron-backend/app/schemas/owner.py` with:

```python
from datetime import date, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ManualBookingStatus


class VenueIn(BaseModel):
    name: str = Field(..., max_length=150)
    address: str | None = Field(None, max_length=255)
    landmark: str | None = Field(None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    opening_time: time
    closing_time: time
    working_days: list[int] = [0, 1, 2, 3, 4, 5, 6]
    is_active: bool = True

    @field_validator("working_days")
    @classmethod
    def valid_days(cls, value: list[int]) -> list[int]:
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("working_days must be 0..6")
        return sorted(set(value))


class VenueOut(VenueIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: int


class OwnerFieldIn(BaseModel):
    name: str = Field(..., max_length=150)
    size: str | None = Field(None, max_length=40)
    surface_type: str = Field("open", pattern="^(open|covered)$")
    price_per_hour: Decimal
    images: list[str] = []
    is_active: bool = True


class OwnerFieldOut(OwnerFieldIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    venue_id: int


class ManualBookingCreate(BaseModel):
    field_id: int
    booking_date: date
    start_time: time
    end_time: time
    customer_name: str | None = Field(None, max_length=120)
    customer_phone: str | None = Field(None, max_length=20)
    price: Decimal
    note: str | None = None


class ManualBookingOut(ManualBookingCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: int
    status: ManualBookingStatus


class OwnerStatsSummary(BaseModel):
    today_revenue: Decimal
    weekly_revenue: Decimal
    monthly_revenue: Decimal
    today_booking_count: int
    weekly_booking_count: int
    monthly_booking_count: int
    top_field_name: str | None
```

- [ ] **Step 4: Add owner service**

Create `gobron-backend/app/services/owner_service.py` with methods:

```python
async def get_or_create_venue(self, owner: User) -> Venue
async def upsert_venue(self, owner: User, body: VenueIn) -> Venue
async def list_fields(self, owner: User) -> list[Field]
async def create_field(self, owner: User, body: OwnerFieldIn) -> Field
async def update_field(self, owner: User, field_id: int, body: OwnerFieldIn) -> Field
async def list_bookings(self, owner: User, day: date | None) -> list[ManualBooking]
async def create_manual_booking(self, owner: User, body: ManualBookingCreate) -> ManualBooking
async def cancel_booking(self, owner: User, booking_id: int) -> ManualBooking
async def complete_booking(self, owner: User, booking_id: int) -> ManualBooking
async def stats_summary(self, owner: User) -> OwnerStatsSummary
```

Overlap predicate:

```python
ManualBooking.start_time < body.end_time,
ManualBooking.end_time > body.start_time,
ManualBooking.status == ManualBookingStatus.BOOKED,
```

Reject overlap with `HTTPException(status.HTTP_409_CONFLICT, "Time range is already booked")`.

- [ ] **Step 5: Add owner router**

Create `gobron-backend/app/api/v1/owner.py`:

```python
router = APIRouter(prefix="/owner", tags=["owner"])
_owner = require_role(UserRole.FIELD_OWNER, UserRole.SUPERADMIN)

@router.get("/venue", response_model=VenueOut)
async def get_venue(db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).get_or_create_venue(user)

@router.put("/venue", response_model=VenueOut)
async def put_venue(body: VenueIn, db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).upsert_venue(user, body)

@router.get("/fields", response_model=list[OwnerFieldOut])
async def list_fields(db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).list_fields(user)

@router.post("/fields", response_model=OwnerFieldOut, status_code=201)
async def create_field(body: OwnerFieldIn, db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).create_field(user, body)

@router.post("/bookings", response_model=ManualBookingOut, status_code=201)
async def create_booking(body: ManualBookingCreate, db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).create_manual_booking(user, body)

@router.get("/stats/summary", response_model=OwnerStatsSummary)
async def stats_summary(db: DBSession, user: User = Depends(_owner)):
    return await OwnerService(db).stats_summary(user)
```

- [ ] **Step 6: Register router**

In `gobron-backend/app/api/v1/router.py`, import and include `owner.router`.

- [ ] **Step 7: Run backend tests**

Run:

```bash
cd gobron-backend
pytest tests/test_owner_flow.py -q
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add gobron-backend/app/schemas/owner.py gobron-backend/app/services/owner_service.py gobron-backend/app/api/v1/owner.py gobron-backend/app/api/v1/router.py gobron-backend/tests/test_owner_flow.py
git commit -m "feat: add owner operations API"
```

---

### Task 4: Flutter Auth and Data Layer

**Files:**
- Modify: `gobron-flutter-admin/lib/features/auth/auth_repository.dart`
- Modify: `gobron-flutter-admin/lib/features/auth/auth_controller.dart`
- Modify: `gobron-flutter-admin/lib/features/auth/login_screen.dart`
- Create: `gobron-flutter-admin/lib/features/venue/models/venue.dart`
- Create: `gobron-flutter-admin/lib/features/venue/venue_repository.dart`
- Create: `gobron-flutter-admin/lib/features/venue/venue_controller.dart`
- Modify: `gobron-flutter-admin/lib/features/fields/models/field.dart`
- Modify: `gobron-flutter-admin/lib/features/fields/fields_repository.dart`
- Create: `gobron-flutter-admin/lib/features/manual_bookings/models/manual_booking.dart`
- Create: `gobron-flutter-admin/lib/features/manual_bookings/manual_booking_repository.dart`
- Create: `gobron-flutter-admin/lib/features/manual_bookings/manual_booking_controller.dart`
- Modify: `gobron-flutter-admin/lib/features/stats/models/dashboard_stats.dart`
- Modify: `gobron-flutter-admin/lib/features/stats/stats_repository.dart`

**Interfaces:**
- Consumes: `/auth/phone-login`, `/owner/venue`, `/owner/fields`, `/owner/bookings`, `/owner/stats/summary`
- Produces: Riverpod controllers for venue, fields, manual bookings, and owner stats.

- [ ] **Step 1: Add repository unit-friendly model parsing**

Define `Venue.fromJson`, `OwnerField.fromJson`, `ManualBooking.fromJson`, and `OwnerStatsSummary.fromJson` with exact backend keys:

```dart
factory Venue.fromJson(Map<String, dynamic> json) => Venue(
  id: json['id'] as int,
  ownerId: json['owner_id'] as int,
  name: json['name'] as String,
  address: json['address'] as String?,
  landmark: json['landmark'] as String?,
  openingTime: parseTime(json['opening_time'] as String),
  closingTime: parseTime(json['closing_time'] as String),
  workingDays: (json['working_days'] as List).cast<int>(),
  isActive: json['is_active'] as bool,
);
```

- [ ] **Step 2: Change auth repository to phone login**

Replace username/password login with:

```dart
Future<UserProfile> loginWithPhone({
  required String phone,
  String? fullName,
}) async {
  final tokens = await _api.post(
    '/auth/phone-login',
    data: {'phone': phone, if (fullName != null) 'full_name': fullName},
  );
  await _tokens.save(
    accessToken: tokens['access_token'] as String,
    refreshToken: tokens['refresh_token'] as String,
  );
  final profile = await fetchMe();
  if (!profile.canManageFields) {
    await _tokens.clear();
    throw ApiException('Bu ilova faqat maydon egalari uchun.');
  }
  return profile;
}
```

- [ ] **Step 3: Change auth controller signature**

Replace login method with:

```dart
Future<void> loginWithPhone({required String phone, String? fullName}) async {
  state = const AsyncLoading();
  state = await AsyncValue.guard(() async {
    final profile = await _repo.loginWithPhone(phone: phone, fullName: fullName);
    return AuthState(profile);
  });
}
```

- [ ] **Step 4: Add repositories**

Implement:

```dart
Future<Venue> getVenue() async => Venue.fromJson(await _api.get('/owner/venue'));
Future<Venue> saveVenue(VenueInput input) async => Venue.fromJson(await _api.put('/owner/venue', data: input.toJson()));
Future<List<ManualBooking>> list({DateTime? date}) async {
  final json = await _api.getList(
    '/owner/bookings',
    query: date == null ? null : {'date': DateFormat('yyyy-MM-dd').format(date)},
  );
  return json.map((e) => ManualBooking.fromJson(e as Map<String, dynamic>)).toList();
}
Future<ManualBooking> create(ManualBookingInput input) async {
  final json = await _api.post('/owner/bookings', data: input.toJson());
  return ManualBooking.fromJson(json);
}
Future<OwnerStatsSummary> summary() async => OwnerStatsSummary.fromJson(await _api.get('/owner/stats/summary'));
```

If `ApiClient` lacks `put`, add:

```dart
Future<Map<String, dynamic>> put(String path, {Object? data}) =>
    _request(() => _dio.put(path, data: data));
```

- [ ] **Step 5: Run Flutter analyze**

Run:

```bash
cd gobron-flutter-admin
dart format lib
flutter analyze
```

Expected: no analyzer errors.

- [ ] **Step 6: Commit**

```bash
git add gobron-flutter-admin/lib
git commit -m "feat: add owner data layer to flutter admin"
```

---

### Task 5: Flutter Owner UI

**Files:**
- Modify: `gobron-flutter-admin/lib/features/auth/login_screen.dart`
- Create: `gobron-flutter-admin/lib/features/venue/presentation/venue_settings_screen.dart`
- Modify: `gobron-flutter-admin/lib/features/fields/presentation/fields_list_screen.dart`
- Modify: `gobron-flutter-admin/lib/features/fields/presentation/field_form_screen.dart`
- Create: `gobron-flutter-admin/lib/features/manual_bookings/presentation/manual_booking_sheet.dart`
- Modify: `gobron-flutter-admin/lib/features/stats/presentation/stats_screen.dart`
- Modify: `gobron-flutter-admin/lib/shell/home_shell.dart`
- Modify: `gobron-flutter-admin/lib/core/routing/app_router.dart`

**Interfaces:**
- Consumes: controllers from Task 4.
- Produces: phone login screen, dashboard with floating `+`, manual booking bottom sheet, venue settings, and updated fields UI.

- [ ] **Step 1: Update login screen**

Use two text fields:

```dart
TextFormField(controller: _phoneController, decoration: const InputDecoration(labelText: 'Telefon raqam'))
TextFormField(controller: _fullNameController, decoration: const InputDecoration(labelText: 'Ism familiya (yangi foydalanuvchi uchun)'))
```

Submit:

```dart
await ref.read(authControllerProvider.notifier).loginWithPhone(
  phone: _phoneController.text.trim(),
  fullName: _fullNameController.text.trim().isEmpty ? null : _fullNameController.text.trim(),
);
```

- [ ] **Step 2: Build Dashboard in StatsScreen**

Show cards:

```dart
_StatTile(label: 'Bugun', value: money(stats.todayRevenue), icon: Icons.today)
_StatTile(label: 'Hafta', value: money(stats.weeklyRevenue), icon: Icons.date_range)
_StatTile(label: 'Oy', value: money(stats.monthlyRevenue), icon: Icons.calendar_month)
```

Add floating action button:

```dart
floatingActionButton: FloatingActionButton.extended(
  onPressed: () => showManualBookingSheet(context, ref),
  icon: const Icon(Icons.add),
  label: const Text('Band qilish'),
)
```

- [ ] **Step 3: Build manual booking sheet**

Create a `showModalBottomSheet` with field selector, date picker, time pickers, customer fields, editable price, and submit button.

Submit:

```dart
await ref.read(manualBookingControllerProvider.notifier).create(
  ManualBookingInput(
    fieldId: selectedField.id!,
    bookingDate: selectedDate,
    startTime: startTime,
    endTime: endTime,
    customerName: _name.text.trim().isEmpty ? null : _name.text.trim(),
    customerPhone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
    price: double.parse(_price.text.trim()),
    note: _note.text.trim().isEmpty ? null : _note.text.trim(),
  ),
);
```

- [ ] **Step 4: Build Venue Settings**

Create form for name, address, landmark, opening/closing time, and working days. Save through `venueControllerProvider.notifier.save(input)`.

- [ ] **Step 5: Update field form**

Fields:

- name
- price per hour
- size
- surface segmented control: `Ochiq`, `Yopiq`
- image URL list as comma-separated input
- active switch

Remove per-field address/opening/closing/working-days from this form.

- [ ] **Step 6: Update HomeShell navigation**

Use tabs:

```dart
static const _screens = [StatsScreen(), FieldsListScreen(), VenueSettingsScreen()];
```

Destinations:

```dart
NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Asosiy')
NavigationDestination(icon: Icon(Icons.sports_soccer_outlined), label: 'Maydonlar')
NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Sozlamalar')
```

- [ ] **Step 7: Run Flutter verification**

Run:

```bash
cd gobron-flutter-admin
dart format lib
flutter analyze
flutter test
```

Expected: no analyzer errors and existing widget test passes or is updated to the new login screen.

- [ ] **Step 8: Commit**

```bash
git add gobron-flutter-admin/lib gobron-flutter-admin/test
git commit -m "feat: build field owner admin UI"
```

---

### Task 6: Integration, Migration, and Deployment Checks

**Files:**
- Modify: `gobron-backend/.env.example`
- Modify: `gobron-flutter-admin/README.md`
- Modify: `gobron-backend/README.md`

**Interfaces:**
- Consumes all previous tasks.
- Produces deployable backend and Flutter admin connected to production API.

- [ ] **Step 1: Run full backend verification**

Run:

```bash
cd gobron-backend
pytest tests/ -q
alembic upgrade head
curl -i http://127.0.0.1:8000/health
```

Expected: tests pass, migration succeeds, health returns `200 OK`.

- [ ] **Step 2: Run full Flutter verification**

Run:

```bash
cd gobron-flutter-admin
dart format --set-exit-if-changed lib test
flutter analyze
flutter test
```

Expected: format unchanged, no analyzer errors, tests pass.

- [ ] **Step 3: Update docs**

In backend README, add owner endpoints summary:

```markdown
Owner:
- POST /auth/phone-login
- GET/PUT /owner/venue
- CRUD /owner/fields
- CRUD /owner/bookings
- GET /owner/stats/summary
```

In Flutter README, document:

```markdown
API_BASE_URL=https://gobronapi.webportfolio.uz/api/v1
```

- [ ] **Step 4: Deploy backend**

On EC2:

```bash
cd /home/ubuntu/gobron
git pull origin main
cd gobron-backend
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
pkill -f "uvicorn app.main:app"
nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &
curl -i https://gobronapi.webportfolio.uz/health
```

Expected: `200 OK`.

- [ ] **Step 5: Smoke test production owner endpoints**

Run:

```bash
curl -i -X POST https://gobronapi.webportfolio.uz/api/v1/auth/phone-login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998900000001","full_name":"Smoke Owner"}'
```

Expected: `200 OK` with `access_token` and `refresh_token`.

- [ ] **Step 6: Commit docs**

```bash
git add gobron-backend/README.md gobron-backend/.env.example gobron-flutter-admin/README.md
git commit -m "docs: document field owner operations"
```

- [ ] **Step 7: Push**

```bash
git push origin main
```

Expected: remote `main` advances to the final commit.
