# Manual Booking Slot Picker

Date: 2026-07-08

## Goal

Replace `ManualBookingModal.tsx`'s two free-form `<input type=time>` fields
with a grid of selectable hour-long slot chips (09:00-10:00, 10:00-11:00,
...). Multiple slots can be selected, but only if contiguous — the modal
still submits a single start/end time range, now derived from the
selection's first and last slot.

## Current State

- `ManualBookingModal.tsx` has raw `startTime`/`endTime` text inputs, no
  awareness of what's already booked for the chosen field/date.
- `api/bookings.ts` (fixed earlier today) has `fetchBookingsByDate(date)`,
  returning every booking across all the owner's fields for that date —
  exactly what's needed to compute which slots are taken.
- `api/venue.ts` is still broken: it posts to `/venue` / `PUT /venue`,
  neither of which exist on the backend (real routes are
  `GET/PUT /owner/venue`, snake_case fields). This is a hard dependency
  for slot generation (slot range = venue opening/closing time), so it
  gets the same endpoint/casing fix `fields.ts` and `bookings.ts` already
  got this session.
- There's a separate, persisted `Slot`/`SlotService` system in the backend
  (`GET /fields/{id}/slots`, `POST /fields/{id}/slots/generate`) for the
  future automated-booking flow. This feature does **not** use it — manual
  bookings stay simple ad-hoc time ranges per the original redesign spec
  (automated booking is explicitly out of scope there). Slot chips here
  are a pure UI convenience for picking a time range, not a new persisted
  concept.

## Fix: `api/venue.ts`

Same shape as the `fields.ts`/`bookings.ts` fixes: typed API response,
`fromApi`/`toApi` snake_case mapping, correct `/owner/venue` path.

```
GET /owner/venue -> { id, owner_id, name, address, landmark, latitude,
                       longitude, opening_time, closing_time, working_days,
                       is_active }
PUT /owner/venue <- same shape
```

`opening_time`/`closing_time` serialize as `"HH:MM:SS"` (confirmed earlier
today for the same `time` Pydantic type on `ManualBookingOut`) — mapped to
`"HH:mm"` by slicing to 5 characters, matching how `bookings.ts` already
handles this.

## Slot Generation

Inline in `ManualBookingModal.tsx` (nothing else needs this yet — no
shared util file per YAGNI):

```ts
interface Slot { start: string; end: string } // "HH:mm"

function generateSlots(opening: string, closing: string, minutes = 60): Slot[] {
  const slots: Slot[] = []
  let [h, m] = opening.split(':').map(Number)
  const [closeH, closeM] = closing.split(':').map(Number)
  const closeMinutes = closeH * 60 + closeM
  while (h * 60 + m + minutes <= closeMinutes) {
    const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    m += minutes
    h += Math.floor(m / 60)
    m %= 60
    const end = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    slots.push({ start, end })
  }
  return slots
}
```

## Availability

`BookingsListPage` (the modal's only caller) fetches bookings for the
modal's currently-selected date via `fetchBookingsByDate(date)` whenever
the date changes, and passes the result down alongside `fields`. The modal
filters to `status === 'booked' && fieldId === selectedFieldId`, then marks
any generated slot whose `[start, end)` overlaps one of those bookings as
disabled (grey, unclickable).

## Selection Model

State: `selectedSlots: Slot[]` (always contiguous, kept sorted).

- Click an available slot **adjacent** to the current selection's first or
  last entry (or the first click when selection is empty) → extend the
  selection to include it.
- Click the **first or last** currently-selected slot again → shrink the
  selection by removing it (deselect from an edge).
- Click any other available slot (not adjacent, not an edge of the current
  selection) → replace the selection with just that one slot.
- Disabled (already-booked) slots are not clickable at all.

`startTime` = `selectedSlots[0].start`, `endTime` =
`selectedSlots[selectedSlots.length - 1].end`.

## Price

`price` auto-fills to `selectedField.pricePerHour * selectedSlots.length`
whenever the field or selection changes, same as today's "auto-fill on
field change" behavior — still a plain editable number input afterward
(owner can override for discounts/custom pricing).

## Validation

Replace the existing `startTime >= endTime` check with: at least one slot
selected (`selectedSlots.length > 0`). Everything else (customer
name/phone, price) is unchanged.

## Submission

`ManualBookingInput` shape is unchanged — `startTime`/`endTime` are just
now computed from `selectedSlots` instead of typed directly. No backend or
type changes.

## Testing

Same convention as the rest of this session's frontend work: `tsc
--noEmit` + `npm run build`, no live backend/browser click-through
(documented gap, not claimed as verified).

## Out of Scope

- The persisted `Slot`/`SlotService` system — untouched.
- Slot duration configurability (fixed 60 min, per earlier decision).
- Marking `cancelled`/`completed` bookings as blocking — only `booked`
  blocks a slot, since a cancelled booking frees the time back up.
