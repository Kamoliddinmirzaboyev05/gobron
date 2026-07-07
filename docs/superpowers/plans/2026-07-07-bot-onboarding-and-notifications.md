# Bot Onboarding and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audience-aware admin posts, field-owner notifications in the Flutter admin app, and simplify the Telegram bot onboarding flow to name, region, phone.

**Architecture:** Reuse the existing `Broadcast` table as the admin post source of truth. Add an audience enum/column so the same post can be delivered through Telegram, exposed to field owners through `/owner/notifications`, or both. Keep UI changes thin: superadmin writes `audience`, Flutter admin reads owner notifications.

**Tech Stack:** FastAPI, SQLAlchemy async, Alembic, Pydantic, aiogram 3, React/Vite/TypeScript, Flutter/Riverpod/Dio.

## Global Constraints

- Bot onboarding order must be first name, region, phone, complete.
- Bot no longer asks for city/tuman or last name.
- Superadmin audience values must be exactly `bot_users`, `field_owners`, and `all`.
- `field_owners` posts must appear in the Flutter admin app even when Telegram delivery is skipped or fails.
- Existing broadcast rows must behave like `bot_users`.
- Add one Alembic migration and deploy with `alembic upgrade head`.
- Restart the API process after deploy; restart the bot polling process if it is running separately.

---

## File Structure

- Modify `gobron-backend/app/models/enums.py`: add `BroadcastAudience`.
- Modify `gobron-backend/app/models/broadcast.py`: add `audience` column and value-based enum mapping.
- Modify `gobron-backend/app/schemas/broadcast.py`: accept/return `audience`.
- Create `gobron-backend/alembic/versions/20260707_broadcast_audience.py`: add non-null broadcast audience column with server default.
- Modify `gobron-backend/app/services/broadcast_service.py`: skip Telegram delivery unless audience includes bot users.
- Modify `gobron-backend/app/api/v1/admin.py`: store `created_by` and audience.
- Modify `gobron-backend/app/api/v1/owner.py`: add owner notifications endpoint.
- Add tests in `gobron-backend/tests/test_notifications_and_bot.py`.
- Modify `gobron-backend/bot/main.py`: reorder onboarding states and persistence.
- Modify `gobron-backend/app/models/user.py`: update onboarding docstring.
- Modify `gobron-superadmin/src/types/index.ts`: add broadcast audience schema.
- Modify `gobron-superadmin/src/hooks/useBroadcasts.ts`: include audience in mutation input.
- Modify `gobron-superadmin/src/pages/Broadcasts.tsx`: add audience segmented/select control.
- Create `gobron-flutter-admin/lib/features/notifications/models/owner_notification.dart`.
- Create `gobron-flutter-admin/lib/features/notifications/notifications_repository.dart`.
- Create `gobron-flutter-admin/lib/features/notifications/notifications_controller.dart`.
- Create `gobron-flutter-admin/lib/features/notifications/presentation/notifications_screen.dart`.
- Modify `gobron-flutter-admin/lib/shell/home_shell.dart`: add notification tab.

---

### Task 1: Backend Broadcast Audience

**Files:**
- Modify: `gobron-backend/app/models/enums.py`
- Modify: `gobron-backend/app/models/broadcast.py`
- Modify: `gobron-backend/app/schemas/broadcast.py`
- Modify: `gobron-backend/app/services/broadcast_service.py`
- Modify: `gobron-backend/app/api/v1/admin.py`
- Create: `gobron-backend/alembic/versions/20260707_broadcast_audience.py`
- Test: `gobron-backend/tests/test_notifications_and_bot.py`

**Interfaces:**
- Produces: `BroadcastAudience` enum with values `bot_users`, `field_owners`, `all`.
- Produces: `BroadcastCreate(text: str, image_url: str | None, audience: BroadcastAudience)`.
- Produces: `BroadcastService._includes_bot_users(broadcast: Broadcast) -> bool`.
- Consumes: existing `BroadcastStatus`, `BroadcastService.send`, and `/admin/broadcasts`.

- [ ] **Step 1: Write failing backend audience tests**

Add `gobron-backend/tests/test_notifications_and_bot.py`:

```python
from app.models.broadcast import Broadcast
from app.models.enums import BroadcastAudience
from app.schemas.broadcast import BroadcastCreate
from app.services.broadcast_service import BroadcastService


def test_broadcast_create_defaults_to_bot_users():
    body = BroadcastCreate(text="Salom")

    assert body.audience == BroadcastAudience.BOT_USERS


def test_broadcast_audience_binds_lowercase_values():
    from sqlalchemy.dialects import postgresql

    status_type = Broadcast.__table__.c.audience.type
    bind_processor = status_type.bind_processor(dialect := postgresql.dialect())

    assert bind_processor is not None
    assert bind_processor(BroadcastAudience.FIELD_OWNERS) == "field_owners"
    assert status_type.result_processor(dialect, None)("all") == BroadcastAudience.ALL


def test_field_owner_broadcast_skips_telegram_delivery():
    broadcast = Broadcast(text="Owner post", audience=BroadcastAudience.FIELD_OWNERS)

    assert BroadcastService._includes_bot_users(broadcast) is False


def test_all_broadcast_includes_telegram_delivery():
    broadcast = Broadcast(text="Everyone", audience=BroadcastAudience.ALL)

    assert BroadcastService._includes_bot_users(broadcast) is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd gobron-backend
DEBUG=false ./.venv/bin/python -m pytest tests/test_notifications_and_bot.py -q
```

Expected: FAIL because `BroadcastAudience`, `Broadcast.audience`, and `_includes_bot_users` do not exist.

- [ ] **Step 3: Add `BroadcastAudience` enum**

In `gobron-backend/app/models/enums.py`, after `BroadcastStatus` add:

```python
class BroadcastAudience(str, enum.Enum):
    BOT_USERS = "bot_users"
    FIELD_OWNERS = "field_owners"
    ALL = "all"
```

- [ ] **Step 4: Add audience to Broadcast model**

In `gobron-backend/app/models/broadcast.py`, import `BroadcastAudience` and add the column after `image_url`:

```python
from app.models.enums import BroadcastAudience, BroadcastStatus
```

```python
    audience: Mapped[BroadcastAudience] = mapped_column(
        Enum(
            BroadcastAudience,
            name="broadcast_audience",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        default=BroadcastAudience.BOT_USERS,
        nullable=False,
    )
```

- [ ] **Step 5: Add Alembic migration**

Create `gobron-backend/alembic/versions/20260707_broadcast_audience.py`:

```python
"""add broadcast audience

Revision ID: 20260707_broadcast_audience
Revises: 20260707_field_owner_redesign
Create Date: 2026-07-07
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260707_broadcast_audience"
down_revision: str | None = "20260707_field_owner_redesign"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    audience = postgresql.ENUM(
        "bot_users",
        "field_owners",
        "all",
        name="broadcast_audience",
        create_type=False,
    )
    audience.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "broadcasts",
        sa.Column(
            "audience",
            audience,
            nullable=False,
            server_default="bot_users",
        ),
    )


def downgrade() -> None:
    op.drop_column("broadcasts", "audience")
    sa.Enum(name="broadcast_audience").drop(op.get_bind(), checkfirst=True)
```

- [ ] **Step 6: Update broadcast schemas**

In `gobron-backend/app/schemas/broadcast.py`, import `BroadcastAudience` and update schemas:

```python
from app.models.enums import BroadcastAudience, BroadcastStatus
```

```python
class BroadcastCreate(BaseModel):
    text: str = Field(..., min_length=1)
    image_url: str | None = None
    audience: BroadcastAudience = BroadcastAudience.BOT_USERS
```

```python
class BroadcastOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    image_url: str | None
    audience: BroadcastAudience
    status: BroadcastStatus
    sent_count: int
    failed_count: int
    created_at: datetime
    sent_at: datetime | None
```

- [ ] **Step 7: Update broadcast service delivery gate**

In `gobron-backend/app/services/broadcast_service.py`, import `BroadcastAudience` and update `send`:

```python
from app.models.enums import BroadcastAudience, BroadcastStatus
```

Add this static method inside `BroadcastService`:

```python
    @staticmethod
    def _includes_bot_users(bc: Broadcast) -> bool:
        return bc.audience in (BroadcastAudience.BOT_USERS, BroadcastAudience.ALL)
```

Replace the recipient send block in `send` with:

```python
        sent = failed = 0
        if self._includes_bot_users(bc):
            recipients = await self.users.all_active_telegram_ids()
            async with httpx.AsyncClient() as client:
                for chat_id in recipients:
                    ok = await self._send_one(client, chat_id, bc)
                    sent += ok
                    failed += not ok
                    await asyncio.sleep(0.05)
```

- [ ] **Step 8: Store audience and creator in admin endpoint**

In `gobron-backend/app/api/v1/admin.py`, change `create_broadcast` to depend on the current superadmin user and set fields:

```python
async def create_broadcast(
    body: BroadcastCreate,
    db: DBSession,
    background: BackgroundTasks,
    user: User = Depends(_superadmin),
    send_now: bool = True,
):
    """Create a post (image optional) and, by default, start delivery."""
    bc = Broadcast(
        created_by=user.id,
        text=body.text,
        image_url=body.image_url,
        audience=body.audience,
    )
```

- [ ] **Step 9: Run backend tests**

Run:

```bash
cd gobron-backend
DEBUG=false ./.venv/bin/python -m pytest tests/test_notifications_and_bot.py tests/test_owner_flow.py -q
```

Expected: PASS.

- [ ] **Step 10: Verify migrations have one head**

Run:

```bash
cd gobron-backend
DEBUG=false ./.venv/bin/python -m alembic heads
```

Expected: exactly `20260707_broadcast_audience (head)`.

- [ ] **Step 11: Commit**

```bash
git add gobron-backend/app/models/enums.py gobron-backend/app/models/broadcast.py gobron-backend/app/schemas/broadcast.py gobron-backend/app/services/broadcast_service.py gobron-backend/app/api/v1/admin.py gobron-backend/alembic/versions/20260707_broadcast_audience.py gobron-backend/tests/test_notifications_and_bot.py
git commit -m "feat: add broadcast audience"
```

---

### Task 2: Owner Notifications API

**Files:**
- Modify: `gobron-backend/app/api/v1/owner.py`
- Modify: `gobron-backend/app/schemas/broadcast.py`
- Test: `gobron-backend/tests/test_notifications_and_bot.py`

**Interfaces:**
- Consumes: `BroadcastAudience` and `BroadcastOut`.
- Produces: `GET /api/v1/owner/notifications -> list[BroadcastOut]`.

- [ ] **Step 1: Write failing owner route test**

Append to `gobron-backend/tests/test_notifications_and_bot.py`:

```python
def test_owner_router_exposes_notifications_route():
    from app.main import app

    paths = {route.path for route in app.routes}

    assert "/api/v1/owner/notifications" in paths
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd gobron-backend
DEBUG=false ./.venv/bin/python -m pytest tests/test_notifications_and_bot.py::test_owner_router_exposes_notifications_route -q
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Add owner notifications endpoint**

In `gobron-backend/app/api/v1/owner.py`, add imports:

```python
from sqlalchemy import select

from app.models.broadcast import Broadcast
from app.models.enums import BroadcastAudience, UserRole
from app.schemas.broadcast import BroadcastOut
```

Replace the existing `from app.models.enums import UserRole` import with the combined import above.

Add this endpoint after `stats_summary`:

```python
@router.get("/notifications", response_model=list[BroadcastOut])
async def list_notifications(db: DBSession, user: User = Depends(_owner)):
    stmt = (
        select(Broadcast)
        .where(Broadcast.audience.in_([BroadcastAudience.FIELD_OWNERS, BroadcastAudience.ALL]))
        .order_by(Broadcast.created_at.desc())
        .limit(100)
    )
    return list((await db.execute(stmt)).scalars().all())
```

- [ ] **Step 4: Run route test**

Run:

```bash
cd gobron-backend
DEBUG=false ./.venv/bin/python -m pytest tests/test_notifications_and_bot.py::test_owner_router_exposes_notifications_route -q
```

Expected: PASS.

- [ ] **Step 5: Run all backend tests**

Run:

```bash
cd gobron-backend
DEBUG=false ./.venv/bin/python -m pytest tests/ -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add gobron-backend/app/api/v1/owner.py gobron-backend/tests/test_notifications_and_bot.py
git commit -m "feat: add owner notifications endpoint"
```

---

### Task 3: Telegram Bot Onboarding Flow

**Files:**
- Modify: `gobron-backend/bot/main.py`
- Modify: `gobron-backend/app/models/user.py`
- Test: `gobron-backend/tests/test_notifications_and_bot.py`

**Interfaces:**
- Produces FSM states: `first_name`, `region`, `phone`.
- Consumes existing `REGIONS`, `_region_keyboard`, `_open_app_keyboard`, and `AsyncSessionLocal`.

- [ ] **Step 1: Write failing bot state test**

Append to `gobron-backend/tests/test_notifications_and_bot.py`:

```python
def test_bot_onboarding_states_are_name_region_phone_only():
    from bot.main import Onboarding

    states = [state.state.split(":")[-1] for state in Onboarding.__states__]

    assert states == ["first_name", "region", "phone"]
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd gobron-backend
DEBUG=false ./.venv/bin/python -m pytest tests/test_notifications_and_bot.py::test_bot_onboarding_states_are_name_region_phone_only -q
```

Expected: FAIL because the current states include `city` and `last_name`, and start with `phone`.

- [ ] **Step 3: Replace bot onboarding states**

In `gobron-backend/bot/main.py`, change the docstring flow to:

```python
Flow: /start -> first name -> pick region -> share phone (contact). On
completion the user row is upserted with is_onboarded=True and a button opens
the Telegram Mini App (TMA).
```

Replace `Onboarding` with:

```python
class Onboarding(StatesGroup):
    first_name = State()
    region = State()
    phone = State()
```

- [ ] **Step 4: Update `/start` to ask for name first**

Replace the onboarding part of `start` with:

```python
    await state.set_state(Onboarding.first_name)
    await message.answer(
        "Assalomu alaykum! Gobronga xush kelibsiz.\n"
        "Ro'yxatdan o'tish uchun ismingizni yozing:",
        reply_markup=ReplyKeyboardRemove(),
    )
```

- [ ] **Step 5: Replace message/callback handlers**

Remove `got_city`, `got_last_name`, and the old phone-first `got_phone` body.
Use these handlers in `gobron-backend/bot/main.py`:

```python
@dp.message(Onboarding.first_name, F.text)
async def got_first_name(message: Message, state: FSMContext):
    first_name = message.text.strip()
    if not first_name:
        await message.answer("Iltimos, ismingizni yozing:")
        return
    await state.update_data(first_name=first_name)
    await state.set_state(Onboarding.region)
    await message.answer("Viloyatingizni tanlang:")
    await message.answer("👇", reply_markup=_region_keyboard())


@dp.callback_query(Onboarding.region, F.data.startswith("region:"))
async def got_region(cb: CallbackQuery, state: FSMContext):
    idx = int(cb.data.split(":", 1)[1])
    await state.update_data(region=REGIONS[idx])
    await state.set_state(Onboarding.phone)
    kb = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Raqamni yuborish", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
    await cb.message.answer(
        f"Viloyat: {REGIONS[idx]}\nEndi telefon raqamingizni yuboring:",
        reply_markup=kb,
    )
    await cb.answer()


@dp.message(Onboarding.phone, F.contact)
async def got_phone(message: Message, state: FSMContext):
    data = await state.get_data()
    await state.clear()

    async with AsyncSessionLocal() as db:
        repo = UserRepository(db)
        user = await repo.get_by_telegram_id(message.from_user.id)
        if user is None:
            user = User(telegram_id=message.from_user.id)
            db.add(user)
        user.phone = message.contact.phone_number
        user.region = data["region"]
        user.first_name = data["first_name"]
        user.city = None
        user.last_name = None
        user.is_onboarded = True
        await db.commit()

    await message.answer(
        "✅ Ro'yxatdan o'tdingiz! Endi ilovadan foydalanishingiz mumkin.",
        reply_markup=ReplyKeyboardRemove(),
    )
    await message.answer("👇", reply_markup=_open_app_keyboard())


@dp.message(Onboarding.phone)
async def phone_retry(message: Message):
    await message.answer("Iltimos, pastdagi tugma orqali raqamingizni yuboring.")
```

- [ ] **Step 6: Update user model docstring**

In `gobron-backend/app/models/user.py`, change:

```python
Onboarding happens in the Telegram bot (start -> phone, region, city, first and
last name); afterwards the user opens the Telegram Mini App (TMA), which logs in
```

to:

```python
Onboarding happens in the Telegram bot (start -> first name, region, phone);
afterwards the user opens the Telegram Mini App (TMA), which logs in
```

- [ ] **Step 7: Run bot/backend tests**

Run:

```bash
cd gobron-backend
DEBUG=false ./.venv/bin/python -m pytest tests/test_notifications_and_bot.py tests/ -q
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add gobron-backend/bot/main.py gobron-backend/app/models/user.py gobron-backend/tests/test_notifications_and_bot.py
git commit -m "feat: simplify bot onboarding"
```

---

### Task 4: Superadmin Audience UI

**Files:**
- Modify: `gobron-superadmin/src/types/index.ts`
- Modify: `gobron-superadmin/src/hooks/useBroadcasts.ts`
- Modify: `gobron-superadmin/src/pages/Broadcasts.tsx`

**Interfaces:**
- Consumes: backend `BroadcastOut.audience`.
- Produces: admin post form payload `{ text: string; image_url?: string | null; audience: "bot_users" | "field_owners" | "all" }`.

- [ ] **Step 1: Update TypeScript broadcast schema**

In `gobron-superadmin/src/types/index.ts`, update `broadcastSchema`:

```typescript
export const broadcastAudienceSchema = z.enum(["bot_users", "field_owners", "all"]);

export const broadcastSchema = z.object({
  id: z.number(),
  text: z.string(),
  image_url: z.string().nullable(),
  audience: broadcastAudienceSchema,
  status: z.enum(["draft", "sending", "sent", "failed"]),
  sent_count: z.number(),
  failed_count: z.number(),
  created_at: z.string(),
  sent_at: z.string().nullable(),
});
```

Add the type:

```typescript
export type BroadcastAudience = z.infer<typeof broadcastAudienceSchema>;
```

- [ ] **Step 2: Update broadcast mutation input**

In `gobron-superadmin/src/hooks/useBroadcasts.ts`, import `BroadcastAudience` and update mutation input:

```typescript
import { broadcastSchema, type Broadcast, type BroadcastAudience } from "../types";
```

```typescript
mutationFn: async (data: {
  text: string;
  image_url?: string | null;
  audience: BroadcastAudience;
}): Promise<Broadcast> => {
  const res = await api.post("/admin/broadcasts", data);
  return broadcastSchema.parse(res.data);
},
```

- [ ] **Step 3: Add audience picker in Broadcasts page**

In `gobron-superadmin/src/pages/Broadcasts.tsx`, import `BroadcastAudience`:

```typescript
import type { BroadcastAudience } from "../types";
```

Add state and options:

```typescript
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const audienceOptions: Array<{ value: BroadcastAudience; label: string }> = [
    { value: "all", label: "Hammaga" },
    { value: "bot_users", label: "Bot foydalanuvchilari" },
    { value: "field_owners", label: "Maydon egalari" },
  ];
```

Change mutation payload:

```typescript
      { text: text.trim(), image_url: imageUrl.trim() || null, audience },
```

Add this control between image URL input and submit button:

```tsx
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {audienceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAudience(option.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                audience === option.value
                  ? "border-pitch-600 bg-pitch-50 text-pitch-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
```

In history cards, add:

```tsx
              <p className="mt-2 text-xs text-gray-500">
                Qabul qiluvchi: {b.audience === "all" ? "Hammaga" : b.audience === "bot_users" ? "Bot foydalanuvchilari" : "Maydon egalari"}
              </p>
```

- [ ] **Step 4: Run superadmin build**

Run:

```bash
cd gobron-superadmin
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add gobron-superadmin/src/types/index.ts gobron-superadmin/src/hooks/useBroadcasts.ts gobron-superadmin/src/pages/Broadcasts.tsx
git commit -m "feat: add broadcast audience selector"
```

---

### Task 5: Flutter Admin Notifications Page

**Files:**
- Create: `gobron-flutter-admin/lib/features/notifications/models/owner_notification.dart`
- Create: `gobron-flutter-admin/lib/features/notifications/notifications_repository.dart`
- Create: `gobron-flutter-admin/lib/features/notifications/notifications_controller.dart`
- Create: `gobron-flutter-admin/lib/features/notifications/presentation/notifications_screen.dart`
- Modify: `gobron-flutter-admin/lib/shell/home_shell.dart`
- Test: `gobron-flutter-admin/test/widget_test.dart`

**Interfaces:**
- Consumes: `GET /owner/notifications`.
- Produces: `OwnerNotification.fromJson(Map<String, dynamic>)`.
- Produces: `notificationsControllerProvider`.

- [ ] **Step 1: Add Flutter model test**

Append to `gobron-flutter-admin/test/widget_test.dart`:

```dart
import 'package:gobron_flutter_admin/features/notifications/models/owner_notification.dart';
```

Add this test:

```dart
test('OwnerNotification parses backend JSON', () {
  final notification = OwnerNotification.fromJson({
    'id': 1,
    'text': 'Yangi xabar',
    'image_url': 'https://example.com/a.jpg',
    'audience': 'field_owners',
    'status': 'sent',
    'sent_count': 0,
    'failed_count': 0,
    'created_at': '2026-07-07T12:00:00Z',
    'sent_at': null,
  });

  expect(notification.id, 1);
  expect(notification.text, 'Yangi xabar');
  expect(notification.imageUrl, 'https://example.com/a.jpg');
  expect(notification.createdAt.toUtc().year, 2026);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd gobron-flutter-admin
flutter test
```

Expected: FAIL because `OwnerNotification` does not exist.

- [ ] **Step 3: Create notification model**

Create `gobron-flutter-admin/lib/features/notifications/models/owner_notification.dart`:

```dart
class OwnerNotification {
  const OwnerNotification({
    required this.id,
    required this.text,
    required this.imageUrl,
    required this.audience,
    required this.status,
    required this.createdAt,
  });

  factory OwnerNotification.fromJson(Map<String, dynamic> json) {
    return OwnerNotification(
      id: json['id'] as int,
      text: json['text'] as String,
      imageUrl: json['image_url'] as String?,
      audience: json['audience'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  final int id;
  final String text;
  final String? imageUrl;
  final String audience;
  final String status;
  final DateTime createdAt;
}
```

- [ ] **Step 4: Create repository**

Create `gobron-flutter-admin/lib/features/notifications/notifications_repository.dart`:

```dart
import '../../core/network/api_client.dart';
import 'models/owner_notification.dart';

class NotificationsRepository {
  NotificationsRepository(this._api);

  final ApiClient _api;

  Future<List<OwnerNotification>> list() async {
    final json = await _api.getList('/owner/notifications');
    return json
        .cast<Map<String, dynamic>>()
        .map(OwnerNotification.fromJson)
        .toList();
  }
}
```

- [ ] **Step 5: Create controller**

Create `gobron-flutter-admin/lib/features/notifications/notifications_controller.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'models/owner_notification.dart';
import 'notifications_repository.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>((ref) {
  return NotificationsRepository(ref.watch(apiClientProvider));
});

final notificationsControllerProvider =
    FutureProvider.autoDispose<List<OwnerNotification>>((ref) {
  return ref.watch(notificationsRepositoryProvider).list();
});
```

- [ ] **Step 6: Create notifications screen**

Create `gobron-flutter-admin/lib/features/notifications/presentation/notifications_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../notifications_controller.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Bildirishnomalar')),
      body: notifications.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Bildirishnomalarni yuklab bo'lmadi: $error'),
          ),
        ),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('Hozircha bildirishnoma yo'q'));
          }
          return RefreshIndicator(
            onRefresh: () => ref.refresh(notificationsControllerProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = items[index];
                final date = DateFormat('d MMM, HH:mm').format(item.createdAt.toLocal());
                return Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(color: Theme.of(context).dividerColor),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (item.imageUrl != null && item.imageUrl!.isNotEmpty) ...[
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              item.imageUrl!,
                              height: 150,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        Text(item.text, style: Theme.of(context).textTheme.bodyLarge),
                        const SizedBox(height: 10),
                        Text(date, style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
```

- [ ] **Step 7: Add tab to home shell**

In `gobron-flutter-admin/lib/shell/home_shell.dart`, import:

```dart
import '../features/notifications/presentation/notifications_screen.dart';
```

Update `_screens`:

```dart
  static const _screens = [
    StatsScreen(),
    FieldsListScreen(),
    NotificationsScreen(),
    VenueSettingsScreen(),
  ];
```

Add destination before settings:

```dart
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            label: 'Bildirishnomalar',
          ),
```

- [ ] **Step 8: Run Flutter verification**

Run:

```bash
cd gobron-flutter-admin
flutter analyze && flutter test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add gobron-flutter-admin/lib/features/notifications gobron-flutter-admin/lib/shell/home_shell.dart gobron-flutter-admin/test/widget_test.dart
git commit -m "feat: add owner notifications screen"
```

---

### Task 6: Final Verification, Push, Deploy

**Files:**
- Verify all changed files.
- No new source files beyond Tasks 1-5.

**Interfaces:**
- Consumes: all prior commits.
- Produces: deployed server with API health and smoke-tested endpoints.

- [ ] **Step 1: Run full backend verification**

```bash
cd gobron-backend
DEBUG=false ./.venv/bin/python -m pytest tests/ -q
DEBUG=false ./.venv/bin/python -m alembic heads
```

Expected: tests PASS and exactly one Alembic head: `20260707_broadcast_audience (head)`.

- [ ] **Step 2: Run superadmin verification**

```bash
cd gobron-superadmin
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run Flutter verification**

```bash
cd gobron-flutter-admin
flutter analyze && flutter test
```

Expected: PASS.

- [ ] **Step 4: Push main**

```bash
git status --short --branch
git push origin main
```

Expected: local `main` pushed to `origin/main`.

- [ ] **Step 5: Deploy backend on server**

```bash
ssh -i /Users/user/Downloads/awsserver.pem -o BatchMode=yes -o ConnectTimeout=8 ubuntu@56.228.42.59 '
set -e
cd /home/ubuntu/gobron
git pull origin main
cd gobron-backend
source .venv/bin/activate
alembic upgrade head
old_pids=$(ps -eo pid,cmd | awk "/uvicorn app.main:app/ && !/awk/ {print \\$1}")
if [ -n "$old_pids" ]; then kill $old_pids; sleep 1; fi
nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 < /dev/null &
sleep 3
curl -i --max-time 8 http://127.0.0.1:8000/health
'
```

Expected: local server health returns `HTTP/1.1 200 OK`.

- [ ] **Step 6: Smoke test production API**

Use a superadmin token from the existing admin login flow or an existing valid token.
Then run:

```bash
curl -i --max-time 12 https://gobronapi.webportfolio.uz/health
curl -i --max-time 12 https://gobronapi.webportfolio.uz/api/v1/owner/notifications \
  -H "Authorization: Bearer <FIELD_OWNER_TOKEN>"
```

Expected: health `200 OK`; notifications endpoint returns `200 OK` and a JSON list.

- [ ] **Step 7: Restart bot process if it is running**

Check server process:

```bash
ssh -i /Users/user/Downloads/awsserver.pem -o BatchMode=yes -o ConnectTimeout=8 ubuntu@56.228.42.59 'ps -eo pid,cmd | grep "python -m bot.main" | grep -v grep || true'
```

If a bot process exists, kill it and restart it from `/home/ubuntu/gobron/gobron-backend`:

```bash
ssh -i /Users/user/Downloads/awsserver.pem -o BatchMode=yes -o ConnectTimeout=8 ubuntu@56.228.42.59 '
cd /home/ubuntu/gobron/gobron-backend
pids=$(ps -eo pid,cmd | awk "/python -m bot.main/ && !/awk/ {print \\$1}")
if [ -n "$pids" ]; then kill $pids; sleep 1; fi
nohup .venv/bin/python -m bot.main > bot.log 2>&1 < /dev/null &
sleep 2
ps -eo pid,cmd | grep "python -m bot.main" | grep -v grep
'
```

Expected: bot process is running with new onboarding flow.

- [ ] **Step 8: Commit any documentation updates**

If README files were changed during implementation, commit them:

```bash
git add gobron-backend/README.md gobron-superadmin/README.md gobron-flutter-admin/README.md
git commit -m "docs: update notification workflow"
```

If no docs changed, skip this step.
