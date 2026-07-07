# Field Owner Admin Redesign

Date: 2026-07-07

## Goal

Rework Gobron around a cleaner field-owner workflow. A field owner should be
able to register with a phone number, configure their venue, manage multiple
fields, manually book time slots while the product is growing, and see revenue
statistics.

## Current State

- The backend already has users, fields, slots, bookings, and admin endpoints.
- The superadmin web panel can list users and already has field CRUD.
- The Flutter admin app exists, but it is not yet the full operational panel for
  field owners.
- The user web app still has Telegram/OTP-oriented session logic.
- Field data currently mixes venue-level data and field-level data in one
  `fields` model.

## Chosen Approach

Use a proper venue-plus-fields domain model.

This avoids repeating the same address and working hours on every field, while
still allowing each field to have its own name, price, dimensions, surface type,
and images.

## Domain Model

### Venue

Represents the physical sports complex or location.

Fields:

- `id`
- `owner_id`
- `name`
- `address`
- `landmark`
- `latitude`
- `longitude`
- `opening_time`
- `closing_time`
- `working_days`
- `is_active`
- `created_at`
- `updated_at`

### Field

Represents one playable field inside a venue.

Fields:

- `id`
- `venue_id`
- `name`
- `size`, for example `20x30`
- `surface_type`, either `open` or `covered`
- `price_per_hour`
- `images`
- `is_active`
- existing scheduling fields can remain for compatibility, but the new owner
  workflow should read venue-level address and working hours.

### Manual Booking

Represents an owner-created booking before automated booking becomes the main
flow.

Fields:

- `id`
- `owner_id`
- `field_id`
- `booking_date`
- `start_time`
- `end_time`
- `customer_name`
- `customer_phone`
- `price`
- `note`
- `status`: `booked`, `cancelled`, or `completed`
- `created_at`
- `updated_at`

Manual bookings must prevent overlapping bookings for the same field and date.

## Auth

Add an OTP-free phone login for the Flutter admin app.

Endpoint:

- `POST /api/v1/auth/phone-login`

Request:

```json
{
  "phone": "+998901234567",
  "full_name": "Ali Valiyev"
}
```

Behavior:

- If the phone exists, issue tokens for that user.
- If the phone does not exist, require `full_name`, create a new `field_owner`
  user, and issue tokens.
- If the user is blocked or inactive, reject the login.
- This is intentionally temporary and should be easy to replace with OTP later.

## Backend API

Add owner-scoped endpoints. Field owners can only access their own data.

Venue:

- `GET /api/v1/owner/venue`
- `PUT /api/v1/owner/venue`

Fields:

- `GET /api/v1/owner/fields`
- `POST /api/v1/owner/fields`
- `PATCH /api/v1/owner/fields/{field_id}`
- `DELETE /api/v1/owner/fields/{field_id}`

Manual bookings:

- `GET /api/v1/owner/bookings?date=YYYY-MM-DD`
- `POST /api/v1/owner/bookings`
- `PATCH /api/v1/owner/bookings/{booking_id}`
- `POST /api/v1/owner/bookings/{booking_id}/cancel`
- `POST /api/v1/owner/bookings/{booking_id}/complete`

Statistics:

- `GET /api/v1/owner/stats/summary`

The stats summary returns:

- today's revenue
- weekly revenue
- monthly revenue
- today's booking count
- weekly booking count
- monthly booking count
- top field by revenue or booking count

## Flutter Admin App

The Flutter app becomes the field-owner operations panel.

### Login / Registration

- The owner enters a phone number.
- Full name is requested when the phone number is not registered yet.
- No OTP for now.
- Existing phone logs in.
- New phone creates a `field_owner` user.

### Dashboard

Shows:

- today's revenue
- weekly revenue
- monthly revenue
- today's booking count
- today's bookings

Actions:

- A polished floating `+` button in the bottom-right opens manual booking.

### Manual Booking Modal

Opened from the dashboard `+` button.

Fields:

- field selector
- date
- start time
- end time
- customer name
- customer phone
- auto-calculated price
- editable price
- optional note

Validation:

- start time must be before end time
- selected time must be within venue working hours
- selected field must not already be booked for the same time range

### Venue Settings

Fields:

- venue name
- address
- landmark
- opening time
- closing time
- working days

These values are shared by all fields in that venue.

### My Fields

Shows the owner fields.

Each field shows:

- name
- price
- size
- open/covered surface
- images
- active/inactive status

Actions:

- add field
- edit field
- deactivate/reactivate field

## Superadmin

Keep the superadmin users list. It already shows all users with filters.

Superadmin field management can remain, but the main owner workflow should move
to the Flutter admin app.

## Migration Plan

1. Add the new `venues` model and migration.
2. Add new `fields` columns: `venue_id`, `size`, `surface_type`,
   `price_per_hour`.
3. Add `manual_bookings`.
4. Backfill a default venue per owner from existing fields where possible.
5. Keep old field columns temporarily to avoid breaking existing web flows.
6. Move new Flutter owner features to the owner-scoped endpoints.

## Testing

Backend:

- phone login creates a field owner when phone is new
- phone login returns existing user when phone exists
- blocked users cannot log in
- owner cannot access another owner's venue, fields, bookings, or stats
- manual booking rejects overlaps
- stats calculate today, weekly, and monthly revenue correctly

Flutter:

- login flow stores tokens
- dashboard loads stats
- manual booking modal creates a booking
- overlapping booking shows an error
- venue settings save and reload
- fields can be added and edited

## Out of Scope

- Payment provider integration.
- Real OTP/SMS verification.
- Public user-web redesign.
- Automated online booking becoming the primary flow.
- Multi-venue per owner. The first implementation supports one venue per owner.
