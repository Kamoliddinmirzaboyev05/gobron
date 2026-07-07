# Bot Onboarding and Notifications

## Goal

Fix the Telegram bot onboarding flow and add admin-created posts that can be
sent to Telegram bot users, field owners in the Flutter admin app, or both.

## Scope

This change covers three surfaces:

- Telegram onboarding bot
- Superadmin broadcast/post page
- Field-owner Flutter admin app notifications page

## Bot Onboarding

The bot onboarding flow becomes:

1. Ask for first name.
2. Ask for region with the existing Uzbekistan region inline keyboard.
3. Ask for phone number using Telegram's contact request button.
4. Save the user and show the Mini App open button.

The bot no longer asks for city/tuman or last name during onboarding.

Persisted user values:

- `telegram_id`: Telegram user id
- `first_name`: typed name
- `region`: selected region
- `phone`: shared contact phone number
- `city`: unchanged/null
- `last_name`: unchanged/null
- `is_onboarded`: `true`

Existing onboarded, non-blocked users still skip onboarding and receive the Mini
App open button on `/start`.

## Admin Posts

The superadmin `E'lonlar` page should let admins create a post with:

- text, required
- image URL, optional
- audience, required

Audience options:

- `bot_users`: send through Telegram bot to onboarded bot users
- `field_owners`: show in field-owner Flutter admin notifications
- `all`: send to bot users and show to field owners

The existing broadcast history remains visible with delivery status and counts.

## Backend Model And API

Extend the existing `Broadcast` concept instead of creating a separate admin
post model.

Add an audience field:

- `audience`: enum/string with `bot_users`, `field_owners`, `all`

Existing broadcast rows without an audience should behave like `bot_users` for
backward compatibility.

Admin endpoints:

- `GET /api/v1/admin/broadcasts`
- `POST /api/v1/admin/broadcasts`

`POST /api/v1/admin/broadcasts` accepts `text`, optional `image_url`, and
`audience`.

Telegram delivery runs only when the audience includes `bot_users`.

Owner endpoint:

- `GET /api/v1/owner/notifications`

It returns broadcasts whose audience includes `field_owners`, newest first.
Only authenticated users with `field_owner` or `superadmin` role can read it.

## Flutter Admin App

Add a `Bildirishnomalar` tab to the field-owner app:

- `Asosiy`
- `Maydonlar`
- `Bildirishnomalar`
- `Sozlamalar`

The notifications page shows:

- post text
- image preview when `image_url` is present
- created date/time
- empty state when there are no notifications
- loading and error states

The page reads from `GET /api/v1/owner/notifications`.

## Error Handling

- Empty post text is rejected in backend and disabled in the admin UI.
- Invalid audience is rejected by backend validation.
- Telegram send failures continue to be counted in `failed_count`.
- Field-owner notifications still save and display even if Telegram delivery
  fails for bot recipients.

## Testing

Backend tests:

- bot onboarding states are ordered first name, region, phone, complete
- broadcast creation stores audience
- Telegram delivery is skipped for `field_owners`
- owner notifications returns only `field_owners` and `all` posts

Frontend checks:

- superadmin build/analyze passes after adding audience selection
- Flutter analyze/test passes after adding notifications tab and data layer

## Deployment Notes

This requires one database migration for the broadcast audience field.
After deployment, run Alembic upgrade and restart the API process. If the bot is
running as a separate polling process, restart the bot process too so the new
onboarding order is active.
