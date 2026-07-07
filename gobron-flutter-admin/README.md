# gobron-flutter-admin

Mobile app for Gobron field owners: configure their venue, manage fields,
manually book time ranges, and see daily/weekly/monthly revenue stats.

## Stack

- Flutter 3.35+ / Dart 3.9+
- State management: Riverpod (`flutter_riverpod`)
- Networking: `dio` (JWT bearer + auto-refresh-on-401 interceptor)
- Navigation: `go_router` (auth-gated redirects)
- Secure storage: `flutter_secure_storage` (Keychain / EncryptedSharedPreferences)
- Config: `flutter_dotenv` (`.env`)

No code generation (`freezed`/`json_serializable`) is used — models are plain
Dart classes with hand-written `fromJson`/`toJson` that mirror the backend's
Pydantic schemas 1:1.

## Setup

```bash
flutter pub get
cp .env.example .env   # set API_BASE_URL to your backend
```

Production API:

```env
API_BASE_URL=https://gobronapi.webportfolio.uz/api/v1
```

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
    auth/           # OTP-free phone login (field-owner role only)
    venue/          # shared venue address, landmark, working days and hours
    fields/         # My Fields list + create/edit (price, size, surface, images)
    manual_bookings/# owner-created bookings while operations are manual
    stats/          # dashboard revenue and today's bookings
  shell/            # bottom-nav shell tying the feature tabs together
```

Login is currently OTP-free phone login for field owners. Existing phone numbers
log in; new phone numbers create a field-owner account when full name is
provided. This is temporary and should be replaced by SMS verification before
broad public rollout.
