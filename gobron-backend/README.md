# Gobron Backend

FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL backend for **Gobron**, an
artificial-football-field booking platform. Includes the slot-generation engine,
double-booking-safe reservations, Telegram Mini App auth, superadmin
user-management, bot broadcasts, and a Telegram onboarding bot.

## Stack

- **FastAPI** (async), **Python 3.11+** (tested on 3.12)
- **SQLAlchemy 2.0** async ORM + **asyncpg**, **Alembic** migrations
- **Pydantic v2** / pydantic-settings
- **PyJWT** auth, **aiogram 3** onboarding bot, **httpx** for Telegram API

## Architecture

Clean layering — routers → services → repositories → models:

```
app/
  core/         config, async DB engine, security (JWT/OTP/Telegram), deps
  models/       SQLAlchemy models (User, Field, Slot, Booking, Payment, Broadcast)
  schemas/      Pydantic v2 request/response models
  repositories/ data-access queries (thin, only what services use)
  services/     business logic (slot engine, bookings, auth, stats, broadcast)
  api/v1/       routers, aggregated in router.py
  utils/        pure helpers (pricing)
  main.py       FastAPI app
bot/            aiogram onboarding bot (shares app.* models/DB)
alembic/        async migration environment
tests/          self-checks
```

### Key logic

- **Slot engine** (`services/slot_service.py`): tiles `[opening, closing)` by
  `slot_duration` (30/60 min), skips non-working days, idempotent regeneration.
- **Double booking** (`services/booking_service.py`): optimistic locking via the
  `Slot.version_id` column — concurrent bookers race, only the first commit wins,
  the loser gets HTTP 409. No long-held row locks.
- **Recurrence**: `once` / `daily` / `weekly` produce one Booking row per slot,
  sharing a `recurrence_group_id`.
- **Auth**: Telegram Mini App `initData` (HMAC-validated) is the primary login;
  phone + OTP is a fallback (dev master code `111111`).

## Setup

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit DATABASE_URL, TELEGRAM_BOT_TOKEN, JWT_SECRET_KEY
```

Create the database, then run migrations:

```bash
createdb gobron   # or via your Postgres tooling
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

## Run

```bash
# API
uvicorn app.main:app --reload
#   docs:   http://localhost:8000/api/v1/docs   (Swagger)
#   health: http://localhost:8000/health

# Telegram onboarding bot (separate process, same venv)
# Also ticks the "1 hour to kickoff" reminder loop, so it must be running in
# production or players never get reminded. Run exactly one instance: the loop
# has no cross-process lock.
python -m bot.main
```

## Tests

```bash
python -m tests.test_slot_engine     # pure slot-tiling + pricing checks
# or, with pytest installed:  pytest tests/
```

## API surface (v1)

| Area     | Endpoints |
|----------|-----------|
| Auth     | `POST /auth/phone-login`, `POST /auth/login`, `POST /auth/telegram`, `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `GET /auth/me` |
| Fields   | `GET /fields`, `GET /fields/{id}`, `POST/PATCH/DELETE /fields/{id}` (owner/admin) |
| Owner    | `GET/PUT /owner/venue`, CRUD `/owner/fields`, CRUD `/owner/bookings`, `GET /owner/stats/summary` |
| Slots    | `GET /fields/{id}/slots`, `POST /fields/{id}/slots/generate`, `POST /fields/{id}/slots`, `POST /slots/{id}/block|unblock` |
| Bookings | `POST /bookings`, `GET /bookings`, `POST /bookings/{id}/cancel` |
| Stats    | `GET /stats/dashboard` (owner sees own, superadmin sees all) |
| Admin    | `GET /admin/users`, block/unblock/role/delete, `POST /admin/broadcasts` |

## Notes / deliberate shortcuts

- OTP store is in-memory (single worker); move to Redis to scale out.
- `/auth/phone-login` is a temporary OTP-free login for field owners while the
  owner app is being launched; replace it with SMS verification before broad
  public rollout.
- Broadcast sender is sequential (~20 msg/s); move to a queue for large audiences.
- Payments (Click/Payme) models exist; provider callbacks are not wired yet.
