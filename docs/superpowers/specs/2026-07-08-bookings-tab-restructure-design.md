# Bookings Tab Restructure

Date: 2026-07-08

## Goal

Replace the admin-pwa's second bottom-nav tab, currently "Maydonlar" (fields
CRUD), with "Bandliklar" (bookings list), filterable by Faol / Hammasi /
Tarix (Active / All / History), in that display order. Field management
(add/edit fields) is not removed — it relocates into the Sozlamalar
(Settings) tab.

## Current State

- `HomeShell.tsx` bottom nav: Asosiy (stats) / Maydonlar (fields) /
  Bildirishnomalar / Sozlamalar.
- `FieldsListPage.tsx` is the fields CRUD list, reachable at tab 2.
- `StatsPage.tsx` shows today's revenue/booking stats, a "today's bookings"
  preview list, and a FAB that opens `ManualBookingModal` to create a
  booking.
- `src/api/bookings.ts` is broken: it posts to `/venue/bookings` and
  `/venue/bookings/manual`, neither of which exist on the backend. The real
  routes are `GET /owner/bookings` (optional `?date=`) and
  `POST /owner/bookings`, both snake_case (`booking_date`, `start_time`,
  `end_time`, `customer_name`, `customer_phone`, `field_id`, `status`).
  `status` is one of `booked` | `cancelled` | `completed` — no `confirmed`/
  `pending` as the current frontend `BookingStatus` type assumes.
- `GET /owner/bookings` with no `date` query param returns every booking for
  the owner (`owner_service.py:103-110`), unfiltered and unpaginated — this
  is what the new "Hammasi" bucket uses.

## Chosen Approach

Filter entirely client-side off one unfiltered fetch, rather than adding
new backend query params. `GET /owner/bookings` (no date) already returns
everything; the three buckets are a pure function of `status` +
`booking_date` compared to today. No backend changes needed for this
feature (the media-upload backend work from earlier today is unrelated and
already shipped).

Field management moves into `VenueSettingsPage.tsx` as an appended section
(reusing the existing `FieldsListPage` list/card rendering and the existing
`/fields/new` and `/fields/edit/:id` routes — those routes and forms don't
change, only the entry point into them does).

## Data Mapping

`src/api/bookings.ts` gets the same treatment `fields.ts` already got: a
typed API response shape + `fromApi`/`toApi` mappers, hitting the correct
`/owner/bookings` paths.

```
GET  /owner/bookings          -> all bookings, no date filter
POST /owner/bookings          -> create (ManualBookingCreate shape)
```

Response fields map: `id`, `field_id`->`fieldId`, `booking_date`->`date`,
`start_time`->`startTime`, `end_time`->`endTime`,
`customer_name`->`customerName`, `customer_phone`->`customerPhone`,
`price`, `note`, `status`. `fieldName` is resolved client-side by joining
against the already-fetched fields list (backend doesn't return it).

`types/index.ts` `BookingStatus` narrows from
`'confirmed' | 'pending' | 'cancelled' | 'completed'` to
`'booked' | 'cancelled' | 'completed'`, and `BookingTile.tsx`'s
`STATUS_STYLES`/`STATUS_LABELS` maps are updated to match (label for
`booked`: "Band qilingan").

## Filter Semantics

- **Faol**: `status === 'booked' && date >= today`
- **Hammasi**: no filter, everything
- **Tarix**: `date < today || status !== 'booked'` (i.e. past-dated
  regardless of status, or explicitly completed/cancelled)

Filter chips render in the order Faol, Hammasi, Tarix. Default selected
tab on page load: Faol.

## New Page: BookingsListPage.tsx

- Route `bookings` in `HomeShell.tsx`, replacing `fields`.
- AppBar title "Bandliklar".
- Three filter chips (reuse the pill/chip styling already used for
  surface-type and working-day selectors elsewhere in the app).
- List of `BookingTile` (existing component, just fixed status enum),
  empty state per bucket ("Faol bandliklar yo'q" / "Bandliklar yo'q" /
  "Tarix bo'sh").
- FAB opens `ManualBookingModal` (moved here from `StatsPage.tsx`) to
  create a manual booking; on success, refetch and switch to Faol tab.

## StatsPage.tsx Changes

- Remove the FAB and `ManualBookingModal` usage (booking creation now lives
  only on the Bookings tab).
- Keep the today's-bookings preview section as read-only (already uses
  `fetchTodayBookings`, unaffected by this change other than the
  `BookingStatus` type narrowing).

## HomeShell.tsx Changes

- Tab 2: `{ to: 'bookings', label: 'Bandliklar', icon: CalendarIcon }`
  (new icon; drop the soccer-ball icon along with the fields route).
- Route `fields` removed; `bookings` added pointing at
  `BookingsListPage`.

## VenueSettingsPage.tsx Changes

- Append a "Maydonlar" section below the existing venue fields, rendering
  the same field list/card UI `FieldsListPage.tsx` has (name, price, size,
  surface chip, active/inactive chip, edit action) plus a "+" row to
  `/fields/new`. `FieldFormPage.tsx` and its routes (`/fields/new`,
  `/fields/edit/:id`) are unchanged.
- `FieldsListPage.tsx` itself is deleted once its rendering is folded in
  (no reason to keep a second copy — YAGNI on preserving an unreachable
  page).

## Testing

- Typecheck (`tsc --noEmit`) after each file change, consistent with how
  the fields.ts / media upload changes were verified earlier this session.
- Manual smoke check of the filter logic isn't practical without a running
  backend + auth in this session (documented as an open gap, same as the
  earlier fields/media work) — recommend the user click through
  Faol/Hammasi/Tarix once deployed.

## Out of Scope

- Cancel/complete action buttons on booking tiles (a booking falls into
  Tarix automatically once its date passes; explicit status-change UI can
  be added later if owners need to cancel a same-day booking early).
- Pagination/date-range narrowing on "Hammasi" (fine at current expected
  data volumes; `ponytail:` upgrade path is a `?limit=`/cursor param on
  `GET /owner/bookings` if an owner's booking history grows large).
- Any change to the manual-booking creation form fields themselves.
