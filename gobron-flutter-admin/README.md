# gobron-flutter-admin

Mobile app for Gobron field owners: manage fields, generate/block slots, and
see today's/upcoming bookings and simple stats.

## Stack

- Flutter 3.35+ / Dart 3.9+
- State management: Riverpod (`flutter_riverpod`)
- Networking: `dio` (JWT bearer + auto-refresh-on-401 interceptor)
- Navigation: `go_router` (auth-gated redirects)
- Secure storage: `flutter_secure_storage` (Keychain / EncryptedSharedPreferences)
- Config: `flutter_dotenv` (`.env`)

No code generation (`freezed`/`json_serializable`) is used — models are plain
Dart classes with hand-written `fromJson`/`toJson` that mirror the backend's
Pydantic schemas 1:1. See `API_CONTRACT.md` for the exact endpoints this app
expects from `gobron-backend`, including two that don't exist yet
(owner-scoped bookings + stats — the backend only had player-scoped queries
when this app was built).

## Setup

```bash
flutter pub get
cp .env.example .env   # set API_BASE_URL to your backend
```

`10.0.2.2` is the Android emulator's alias for the host machine's `localhost`.
On iOS simulator or a real device, use your machine's LAN IP instead.

## Run

```bash
flutter run
```

## Test / lint

```bash
flutter analyze
flutter test
```

## Structure

```
lib/
  core/            # config, dio client, secure token storage, router, theme
  features/
    auth/           # phone + OTP login (field-owner role only)
    fields/         # My Fields list + create/edit (opening/closing time, slot duration, working days)
    slots/          # per-field slot calendar: generate / manual add / block-unblock
    bookings/       # today's + upcoming bookings across the owner's fields
    stats/          # revenue, occupancy, popular slots
  shell/            # bottom-nav shell tying the four feature tabs together
```

Login is phone + OTP only (matches the backend's fallback auth path) — this
app does not use Telegram `initData` login, since field owners install the
app directly rather than opening it inside Telegram.
