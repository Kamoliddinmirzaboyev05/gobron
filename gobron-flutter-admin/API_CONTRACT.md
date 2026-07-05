# API contract — gobron-flutter-admin ↔ gobron-backend

This app is built against `gobron-backend`'s existing models/schemas
(`app/models/*`, `app/schemas/*`), which were already in place when this app
was started. The routers below did **not** exist yet in the backend at that
point — only `app/api/v1/routers/` (empty) — so this is the contract the
backend needs to implement for the app to work against a real server. Every
request/response body matches an existing Pydantic schema; only the two
"owner bookings" / "owner stats" endpoints need new query logic since no
existing repository method scopes bookings/stats by field owner.

Base URL: `{API_BASE_URL}/api/v1` (see `.env.example`).
All endpoints except `/auth/*` require `Authorization: Bearer <access_token>`
and `require_role(UserRole.FIELD_OWNER)`.

## Auth (matches `app/schemas/auth.py`, `app/core/security.py` as-is)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/otp/request` | `OTPRequest` | 204 |
| POST | `/auth/otp/verify` | `OTPVerify` | `TokenPair` |
| POST | `/auth/refresh` | `RefreshRequest` | `TokenPair` |
| GET | `/users/me` | — | `UserOut` |

## Fields (owner-scoped; matches `app/schemas/field.py`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/owner/fields` | — | `list[FieldOut]` (only `Field.owner_id == current_user.id`) |
| POST | `/owner/fields` | `FieldCreate` | `FieldOut` |
| PATCH | `/owner/fields/{field_id}` | `FieldUpdate` | `FieldOut` |

## Slots (matches `app/schemas/slot.py`, `SlotService`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/owner/fields/{field_id}/slots?date_from&date_to` | — | `list[SlotOut]` |
| POST | `/owner/fields/{field_id}/slots/generate` | `GenerateSlotsRequest` | `list[SlotOut]` (wraps `SlotService.generate_daily_slots`) |
| POST | `/owner/fields/{field_id}/slots` | `ManualSlotCreate` | `SlotOut` (wraps `SlotService.add_manual_slot`) |
| POST | `/owner/slots/{slot_id}/block` | — | `SlotOut` (wraps `SlotService.block_slot`) |
| POST | `/owner/slots/{slot_id}/unblock` | — | `SlotOut` (wraps `SlotService.unblock_slot`) |

All four must verify the slot's field belongs to the current owner before
acting (404 otherwise) — `SlotService` itself doesn't check ownership.

## Bookings — **needs a new repository method**

`BookingRepository.list_for_user` filters by `Booking.user_id`, i.e. a
player's own bookings. There is no existing method that lists bookings for
everything an *owner*'s fields host. Add e.g.:

```python
async def list_for_owner(self, owner_id: int, *, status: BookingStatus | None = None) -> list[Booking]:
    stmt = (
        select(Booking)
        .join(Slot, Booking.slot_id == Slot.id)
        .join(Field, Slot.field_id == Field.id)
        .where(Field.owner_id == owner_id)
        .options(selectinload(Booking.slot))
        .order_by(Slot.slot_date, Slot.start_time)
    )
    if status is not None:
        stmt = stmt.where(Booking.status == status)
    return list((await self.db.execute(stmt)).scalars().all())
```

| Method | Path | Response |
|---|---|---|
| GET | `/owner/bookings` | `list[BookingOut]` (all fields owned by current user, slot preloaded) |

## Stats — **needs a new service** (no `stats_service.py` exists yet)

`app/schemas/stats.py` already defines `DashboardStats`. Add a
`StatsService.dashboard(owner_id, date_from, date_to)` that aggregates,
scoped to the owner's fields:

- `total_revenue` / `total_bookings`: sum/count of `Booking` (via `Slot.field.owner_id`) with `status in (CONFIRMED, COMPLETED)`
- `active_fields`: count of `Field` where `owner_id` matches and `is_active`
- `occupancy_rate`: booked slots / total slots in range, same owner scope
- `revenue_series`: group the above by `Slot.slot_date`
- `popular_slots`: group by `Slot.start_time`, order by booking count desc

| Method | Path | Response |
|---|---|---|
| GET | `/owner/stats/dashboard?date_from&date_to&field_id` | `DashboardStats` |
