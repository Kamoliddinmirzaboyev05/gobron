# Bookings Tab Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace admin-pwa's second bottom-nav tab ("Maydonlar"/fields) with "Bandliklar" (bookings), filterable by Faol/Hammasi/Tarix, and relocate fields CRUD into the Sozlamalar (Settings) tab.

**Architecture:** Fix the pre-existing endpoint/casing bugs in `bookings.ts` and `stats.ts` (same class of bug already fixed in `fields.ts` this session — wrong `/venue/*` paths that 404 against the real `/owner/*` backend routes, and camelCase/snake_case mismatches), add a new `BookingsListPage` that fetches all bookings once and filters client-side, and fold `FieldsListPage`'s rendering into `VenueSettingsPage` via a shared `FieldCard` component.

**Tech Stack:** React + TypeScript + Vite, axios, react-router-dom. No test runner exists in this project (`package.json` only has `dev`/`build`/`preview`) — verification is `npx tsc --noEmit` plus `npm run build`, matching how the earlier `fields.ts`/media-upload work in this session was verified. This plan follows that same convention rather than introducing a new test framework.

**Reference:** `docs/superpowers/specs/2026-07-08-bookings-tab-restructure-design.md`

---

### Task 1: Narrow `BookingStatus` and fix `BookingTile` labels

**Files:**
- Modify: `admin-pwa/src/types/index.ts:54`
- Modify: `admin-pwa/src/components/BookingTile.tsx:1-15`

- [ ] **Step 1: Narrow the status union**

In `admin-pwa/src/types/index.ts`, replace line 54:

```ts
export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed'
```

with:

```ts
export type BookingStatus = 'booked' | 'cancelled' | 'completed'
```

This matches the backend's `ManualBookingStatus` enum (`app/models/enums.py` in `gobron-backend`), which only has these three values.

- [ ] **Step 2: Update the style/label maps**

In `admin-pwa/src/components/BookingTile.tsx`, replace lines 3-15:

```ts
const STATUS_STYLES: Record<BookingStatus, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Tasdiqlangan',
  pending: 'Kutilmoqda',
  cancelled: 'Bekor qilingan',
  completed: 'Tugallangan',
}
```

with:

```ts
const STATUS_STYLES: Record<BookingStatus, string> = {
  booked: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  booked: 'Band qilingan',
  cancelled: 'Bekor qilingan',
  completed: 'Tugallangan',
}
```

- [ ] **Step 3: Typecheck**

Run: `cd admin-pwa && npx tsc --noEmit`
Expected: no errors mentioning `types/index.ts` or `BookingTile.tsx`. (Other pre-existing errors from concurrent work on `LoginPage.tsx`, if still present, are unrelated — see Task 9.)

- [ ] **Step 4: Commit**

```bash
git add admin-pwa/src/types/index.ts admin-pwa/src/components/BookingTile.tsx
git commit -m "fix: narrow BookingStatus to match backend enum (booked/cancelled/completed)"
```

---

### Task 2: Fix `bookings.ts` to hit the real backend routes

**Files:**
- Modify: `admin-pwa/src/api/bookings.ts` (full rewrite)

The backend only exposes `GET /owner/bookings` (optional `?date=YYYY-MM-DD`) and `POST /owner/bookings` (`app/api/v1/owner.py`). There is no `/venue/bookings` or `/venue/bookings/manual`. Response shape is `ManualBookingOut` (snake_case, `time` fields serialize as `"HH:MM:SS"`, `price` serializes as a numeric string).

- [ ] **Step 1: Replace the file contents**

```ts
import api from './client'
import type { Booking, BookingStatus, ManualBookingInput } from '../types'

interface ManualBookingApi {
  id: number
  owner_id: number
  field_id: number
  booking_date: string
  start_time: string
  end_time: string
  customer_name: string | null
  customer_phone: string | null
  price: string
  note: string | null
  status: BookingStatus
}

function fromApi(b: ManualBookingApi): Booking {
  return {
    id: String(b.id),
    fieldId: String(b.field_id),
    customerName: b.customer_name ?? '',
    customerPhone: b.customer_phone ?? '',
    date: b.booking_date,
    startTime: b.start_time.slice(0, 5),
    endTime: b.end_time.slice(0, 5),
    price: Number(b.price),
    status: b.status,
    note: b.note ?? undefined,
  }
}

/** All bookings for the owner, unfiltered (used by the Bookings tab). */
export async function fetchBookings(): Promise<Booking[]> {
  const { data } = await api.get<ManualBookingApi[]>('/owner/bookings')
  return data.map(fromApi)
}

/** Bookings for one date (used by the Stats/Dashboard "today" preview). */
export async function fetchBookingsByDate(date: string): Promise<Booking[]> {
  const { data } = await api.get<ManualBookingApi[]>('/owner/bookings', { params: { date } })
  return data.map(fromApi)
}

export async function createManualBooking(input: ManualBookingInput): Promise<Booking> {
  const { data } = await api.post<ManualBookingApi>('/owner/bookings', {
    field_id: Number(input.fieldId),
    booking_date: input.date,
    start_time: input.startTime,
    end_time: input.endTime,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    price: input.price,
    note: input.note,
  })
  return fromApi(data)
}
```

- [ ] **Step 2: Typecheck**

Run: `cd admin-pwa && npx tsc --noEmit`
Expected: errors in files that still call the old `fetchBookings`/`fetchTodayBookings` signatures (`StatsPage.tsx`, `stats.ts`) — these get fixed in Tasks 3-4, so seeing them now is expected, not a regression.

- [ ] **Step 3: Commit**

```bash
git add admin-pwa/src/api/bookings.ts
git commit -m "fix: point bookings API at /owner/bookings, map snake_case response"
```

---

### Task 3: Fix `stats.ts` to hit the real backend routes

**Files:**
- Modify: `admin-pwa/src/api/stats.ts` (full rewrite)

Backend: `GET /owner/stats/summary` returns `OwnerStatsSummary` (snake_case: `today_revenue`, `weekly_revenue`, `monthly_revenue`, `today_booking_count`, `weekly_booking_count`, `monthly_booking_count`, `top_field_name`). There's no `/venue/stats` or `/venue/bookings/today` — "today's bookings" is `fetchBookingsByDate(today)` from `bookings.ts` (Task 2).

- [ ] **Step 1: Replace the file contents**

```ts
import api from './client'
import type { DashboardStats } from '../types'

interface OwnerStatsSummaryApi {
  today_revenue: string
  weekly_revenue: string
  monthly_revenue: string
  today_booking_count: number
  weekly_booking_count: number
  monthly_booking_count: number
  top_field_name: string | null
}

export async function fetchStats(): Promise<DashboardStats> {
  const { data } = await api.get<OwnerStatsSummaryApi>('/owner/stats/summary')
  return {
    todayRevenue: Number(data.today_revenue),
    weeklyRevenue: Number(data.weekly_revenue),
    monthlyRevenue: Number(data.monthly_revenue),
    todayBookingCount: data.today_booking_count,
    weeklyBookingCount: data.weekly_booking_count,
    monthlyBookingCount: data.monthly_booking_count,
    topFieldName: data.top_field_name ?? undefined,
  }
}
```

- [ ] **Step 2: Update `StatsPage.tsx`'s import and today's-bookings fetch**

In `admin-pwa/src/pages/StatsPage.tsx`, replace line 2:

```ts
import { fetchStats, fetchTodayBookings } from '../api/stats'
```

with:

```ts
import { fetchStats } from '../api/stats'
import { fetchBookingsByDate } from '../api/bookings'
```

Replace lines 25-28 (the `todayBookings` load):

```ts
  const { data: todayBookings, loading: bookingsLoading } = useLoad<Booking[]>(
    () => fetchTodayBookings(),
    [refreshKey]
  )
```

with:

```ts
  const { data: todayBookings, loading: bookingsLoading } = useLoad<Booking[]>(
    () => fetchBookingsByDate(new Date().toISOString().split('T')[0]),
    [refreshKey]
  )
```

- [ ] **Step 3: Typecheck**

Run: `cd admin-pwa && npx tsc --noEmit`
Expected: no errors in `stats.ts` or the parts of `StatsPage.tsx` touched so far. The FAB/`ManualBookingModal`/`fetchFields` lines in `StatsPage.tsx` are handled in Task 8 — don't touch them yet.

- [ ] **Step 4: Commit**

```bash
git add admin-pwa/src/api/stats.ts admin-pwa/src/pages/StatsPage.tsx
git commit -m "fix: point stats API at /owner/stats/summary, use dated bookings fetch for today's list"
```

---

### Task 4: Extract `FieldCard` into its own component

**Files:**
- Create: `admin-pwa/src/components/FieldCard.tsx`

`FieldsListPage.tsx` currently defines a local `FieldCard` function (lines 60-108). It's needed both by the fields section soon to live in `VenueSettingsPage.tsx` and (transiently) by `FieldsListPage.tsx` until Task 6 deletes it. Extracting it now avoids duplicating the JSX.

- [ ] **Step 1: Create the component file**

```tsx
import type { Field } from '../types'

function formatSum(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm"
}

export default function FieldCard({ field, onEdit }: { field: Field; onEdit: () => void }) {
  return (
    <div className="card overflow-hidden" onClick={onEdit}>
      {field.images.length > 0 && (
        <img
          src={field.images[0]}
          alt={field.name}
          className="w-full h-36 object-cover"
        />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{field.name}</h3>
            {field.size && (
              <p className="text-sm text-gray-500 mt-0.5">{field.size}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`chip ${
                field.surfaceType === 'covered'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {field.surfaceType === 'covered' ? 'Yopiq' : 'Ochiq'}
            </span>
            {!field.isActive && (
              <span className="chip bg-red-100 text-red-600">O'chirilgan</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-primary font-bold">{formatSum(field.pricePerHour)}/soat</p>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="text-gray-400 hover:text-primary transition-colors p-1"
          >
            <EditIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd admin-pwa && npx tsc --noEmit`
Expected: no errors in `FieldCard.tsx` (it isn't imported anywhere yet, so this just validates syntax/types).

- [ ] **Step 3: Commit**

```bash
git add admin-pwa/src/components/FieldCard.tsx
git commit -m "refactor: extract FieldCard into its own component"
```

---

### Task 5: Fold fields CRUD into `VenueSettingsPage.tsx`, delete `FieldsListPage.tsx`

**Files:**
- Modify: `admin-pwa/src/pages/VenueSettingsPage.tsx`
- Delete: `admin-pwa/src/pages/FieldsListPage.tsx`

- [ ] **Step 1: Add the fields-section imports and data load**

In `admin-pwa/src/pages/VenueSettingsPage.tsx`, replace lines 1-6:

```ts
import { useState, useEffect, FormEvent } from 'react'
import { fetchVenue, updateVenue } from '../api/venue'
import type { Venue } from '../types'
import { WEEKDAY_LABELS } from '../types'
import { useLoad } from '../hooks/useLoad'
import { VenueSettingsSkeleton } from '../components/Skeleton'
```

with:

```ts
import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchVenue, updateVenue } from '../api/venue'
import { fetchFields } from '../api/fields'
import type { Venue, Field } from '../types'
import { WEEKDAY_LABELS } from '../types'
import { useLoad } from '../hooks/useLoad'
import { VenueSettingsSkeleton } from '../components/Skeleton'
import FieldCard from '../components/FieldCard'
```

- [ ] **Step 2: Add `navigate` and the fields load inside the component**

Replace line 9 (`export default function VenueSettingsPage() {`) block start — insert right after it:

```ts
export default function VenueSettingsPage() {
  const navigate = useNavigate()
  const { data: venue, loading } = useLoad<Venue>(() => fetchVenue(), [])
  const { data: fields } = useLoad<Field[]>(() => fetchFields(), [])
```

(This replaces the old single-line `const { data: venue, loading } = useLoad<Venue>(() => fetchVenue(), [])` — add the `navigate` line above it and the `fields` load below it.)

- [ ] **Step 3: Append the fields section to the JSX**

In the `<form>` block, right before the closing `{/* Active toggle */}` section's closing `</div>` and the `{saveError}` block — i.e. right after the "Working days" `<div>` block closes (after the line `</div>` that closes `{/* Working days */}`) and before `{/* Active toggle */}` — insert a new section. Concretely, find this exact block:

```tsx
          {/* Active toggle */}
          <div className="card px-4 py-3 flex items-center justify-between">
```

and insert immediately above it:

```tsx
          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Maydonlar</label>
              <button
                type="button"
                onClick={() => navigate('/fields/new')}
                className="text-primary text-sm font-medium"
              >
                + Qo'shish
              </button>
            </div>
            {fields && fields.length > 0 ? (
              <div className="flex flex-col gap-3">
                {fields.map((field) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    onEdit={() => navigate(`/fields/edit/${field.id}`, { state: { field } })}
                  />
                ))}
              </div>
            ) : (
              <div className="card p-6 text-center text-gray-400 text-sm">
                Hozircha maydon yo'q
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="card px-4 py-3 flex items-center justify-between">
```

- [ ] **Step 4: Delete the old fields list page**

```bash
rm admin-pwa/src/pages/FieldsListPage.tsx
```

- [ ] **Step 5: Typecheck**

Run: `cd admin-pwa && npx tsc --noEmit`
Expected: an error in `HomeShell.tsx` (`Cannot find module './FieldsListPage'`) — expected, fixed in Task 6. No errors should point at `VenueSettingsPage.tsx` itself.

- [ ] **Step 6: Commit**

```bash
git add admin-pwa/src/pages/VenueSettingsPage.tsx
git rm admin-pwa/src/pages/FieldsListPage.tsx
git commit -m "refactor: move fields CRUD list into Venue Settings page"
```

---

### Task 6: Build `BookingsListPage.tsx`

**Files:**
- Create: `admin-pwa/src/pages/BookingsListPage.tsx`

Filter semantics (from the spec): **Faol** = `status === 'booked' && date >= today`; **Hammasi** = no filter; **Tarix** = `date < today || status !== 'booked'`. Chips render in the order Faol, Hammasi, Tarix, defaulting to Faol. The manual-booking FAB moves here from `StatsPage.tsx` (removed there in Task 8).

- [ ] **Step 1: Create the page**

```tsx
import { useState, useCallback } from 'react'
import { fetchBookings, createManualBooking } from '../api/bookings'
import { fetchFields } from '../api/fields'
import type { Booking, Field, ManualBookingInput } from '../types'
import { useLoad } from '../hooks/useLoad'
import ManualBookingModal from '../components/ManualBookingModal'
import BookingTile from '../components/BookingTile'

type Bucket = 'faol' | 'hammasi' | 'tarix'

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'faol', label: 'Faol' },
  { key: 'hammasi', label: 'Hammasi' },
  { key: 'tarix', label: 'Tarix' },
]

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function matchesBucket(b: Booking, bucket: Bucket, today: string): boolean {
  if (bucket === 'hammasi') return true
  const isUpcoming = b.status === 'booked' && b.date >= today
  return bucket === 'faol' ? isUpcoming : !isUpcoming
}

const EMPTY_LABEL: Record<Bucket, string> = {
  faol: "Faol bandliklar yo'q",
  hammasi: "Bandliklar yo'q",
  tarix: "Tarix bo'sh",
}

export default function BookingsListPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [bucket, setBucket] = useState<Bucket>('faol')
  const [showBookingModal, setShowBookingModal] = useState(false)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const { data: bookings, loading } = useLoad<Booking[]>(() => fetchBookings(), [refreshKey])
  const { data: fields } = useLoad<Field[]>(() => fetchFields(), [])

  const fieldNameById = new Map((fields ?? []).map((f) => [f.id, f.name]))
  const today = todayString()
  const filtered = (bookings ?? []).filter((b) => matchesBucket(b, bucket, today))

  async function handleCreateBooking(input: ManualBookingInput) {
    await createManualBooking(input)
    setShowBookingModal(false)
    setBucket('faol')
    refresh()
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* AppBar */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Bandliklar</h1>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100">
        {BUCKETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setBucket(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
              bucket === key
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && !bookings ? (
          <div className="card p-6 text-center text-gray-400 text-sm">Yuklanmoqda...</div>
        ) : filtered.length > 0 ? (
          <div className="flex flex-col gap-2">
            {filtered.map((b) => (
              <BookingTile
                key={b.id}
                booking={{ ...b, fieldName: fieldNameById.get(b.fieldId) }}
              />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-400">
            <p>{EMPTY_LABEL[bucket]}</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowBookingModal(true)}
        className="fixed bottom-20 right-4 bg-primary text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
        aria-label="Band qilish"
      >
        <PlusIcon />
      </button>

      {showBookingModal && (
        <ManualBookingModal
          fields={fields ?? []}
          onConfirm={handleCreateBooking}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd admin-pwa && npx tsc --noEmit`
Expected: no errors in `BookingsListPage.tsx`. (`Field.id`/`Booking.fieldId` are both typed `string`, so the `Map` lookup by id type-checks.)

- [ ] **Step 3: Commit**

```bash
git add admin-pwa/src/pages/BookingsListPage.tsx
git commit -m "feat: add Bookings tab with Faol/Hammasi/Tarix filters"
```

---

### Task 7: Wire up `HomeShell.tsx` navigation

**Files:**
- Modify: `admin-pwa/src/pages/HomeShell.tsx`

- [ ] **Step 1: Swap the import and tab entry**

Replace line 3:

```ts
import FieldsListPage from './FieldsListPage'
```

with:

```ts
import BookingsListPage from './BookingsListPage'
```

Replace line 9:

```ts
  { to: 'fields', label: 'Maydonlar', icon: SoccerIcon },
```

with:

```ts
  { to: 'bookings', label: 'Bandliklar', icon: CalendarIcon },
```

Replace line 22:

```tsx
          <Route path="fields" element={<FieldsListPage />} />
```

with:

```tsx
          <Route path="bookings" element={<BookingsListPage />} />
```

- [ ] **Step 2: Replace the `SoccerIcon` function with `CalendarIcon`**

Replace the `SoccerIcon` function (lines 66-85):

```tsx
function SoccerIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12" cy="12" r="9"
        stroke="currentColor"
        strokeWidth="1.8"
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.15 : 0}
      />
      <path
        d="M12 7l-2.5 2 1 3h3l1-3L12 7zM9.5 9L7 10.5M14.5 9L17 10.5M9.5 12H7.5l-1 3M14.5 12H16.5l1 3M9.5 15l1 2.5M14.5 15l-1 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
```

with:

```tsx
function CalendarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect
        x="3" y="5" width="18" height="16" rx="2"
        stroke="currentColor" strokeWidth="1.8"
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.15 : 0}
      />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd admin-pwa && npx tsc --noEmit`
Expected: no errors in `HomeShell.tsx`.

- [ ] **Step 4: Commit**

```bash
git add admin-pwa/src/pages/HomeShell.tsx
git commit -m "feat: replace Maydonlar tab with Bandliklar in bottom nav"
```

---

### Task 8: Remove the manual-booking FAB from `StatsPage.tsx`

**Files:**
- Modify: `admin-pwa/src/pages/StatsPage.tsx`

The dashboard keeps its read-only "today's bookings" preview but no longer creates bookings directly — that now only happens on the Bookings tab (Task 6).

- [ ] **Step 1: Drop the now-unused imports and state**

Replace lines 1-9 (current imports, after Task 3's edit):

```ts
import { useState, useCallback } from 'react'
import { fetchStats } from '../api/stats'
import { fetchBookingsByDate } from '../api/bookings'
import { createManualBooking } from '../api/bookings'
import { fetchFields } from '../api/fields'
import type { DashboardStats, Booking, Field, ManualBookingInput } from '../types'
import { useLoad } from '../hooks/useLoad'
import ManualBookingModal from '../components/ManualBookingModal'
import BookingTile from '../components/BookingTile'
import { StatsPageSkeleton } from '../components/Skeleton'
```

with:

```ts
import { useState } from 'react'
import { fetchStats } from '../api/stats'
import { fetchBookingsByDate } from '../api/bookings'
import type { DashboardStats, Booking } from '../types'
import { useLoad } from '../hooks/useLoad'
import BookingTile from '../components/BookingTile'
import { StatsPageSkeleton } from '../components/Skeleton'
```

- [ ] **Step 2: Remove the FAB, modal, and their supporting code**

Delete the `showBookingModal` state, the `refresh`/`handleCreateBooking` functions, the `fields` load, and the `{/* FAB */}` + `{/* Manual Booking Modal */}` JSX blocks. The component body becomes:

```tsx
export default function StatsPage() {
  const [refreshKey] = useState(0)

  const { data: stats, loading: statsLoading } = useLoad<DashboardStats>(
    () => fetchStats(),
    [refreshKey]
  )
  const { data: todayBookings, loading: bookingsLoading } = useLoad<Booking[]>(
    () => fetchBookingsByDate(new Date().toISOString().split('T')[0]),
    [refreshKey]
  )

  const loading = statsLoading || bookingsLoading

  return (
    <div className="flex flex-col min-h-full">
      {/* AppBar */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Asosiy</h1>
      </div>

      {/* Pull-to-refresh area */}
      <div className="flex-1 overflow-y-auto">
        {loading && !stats ? (
          <StatsPageSkeleton />
        ) : (
          <div className="p-4 flex flex-col gap-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Bugun"
                value={formatSum(stats?.todayRevenue ?? 0)}
                sub={`${stats?.todayBookingCount ?? 0} ta band`}
              />
              <StatTile
                label="Hafta"
                value={formatSum(stats?.weeklyRevenue ?? 0)}
                sub={`${stats?.weeklyBookingCount ?? 0} ta band`}
              />
              <StatTile
                label="Oy"
                value={formatSum(stats?.monthlyRevenue ?? 0)}
                sub={`${stats?.monthlyBookingCount ?? 0} ta band`}
              />
              <StatTile
                label="Bugungi bandlik"
                value={`${stats?.todayBookingCount ?? 0}`}
                sub={stats?.topFieldName ? `Top: ${stats.topFieldName}` : ''}
              />
            </div>

            {/* Today's Bookings */}
            <section>
              <h2 className="text-base font-semibold text-gray-800 mb-3">Bugungi bandliklar</h2>
              {todayBookings && todayBookings.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {todayBookings.map((b) => (
                    <BookingTile key={b.id} booking={b} />
                  ))}
                </div>
              ) : (
                <div className="card p-6 text-center text-gray-400 text-sm">
                  Bugun band qilinmagan
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
```

Keep the existing `formatSum` and `StatTile` helper functions at the bottom of the file as they are; delete the now-unused `PlusIcon` function (it moved to `BookingsListPage.tsx` in Task 6).

- [ ] **Step 3: Typecheck**

Run: `cd admin-pwa && npx tsc --noEmit`
Expected: no errors in `StatsPage.tsx`.

- [ ] **Step 4: Commit**

```bash
git add admin-pwa/src/pages/StatsPage.tsx
git commit -m "refactor: remove manual-booking FAB from dashboard (moved to Bookings tab)"
```

---

### Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd admin-pwa && npx tsc --noEmit`
Expected: zero errors. If errors remain in `LoginPage.tsx` or other auth-related files from the unrelated concurrent password-auth work mentioned earlier in this session, confirm they're unchanged from before this plan started (i.e., not something this plan introduced) rather than fixing them here — that work belongs to a different in-flight change.

- [ ] **Step 2: Production build**

Run: `cd admin-pwa && npm run build`
Expected: build succeeds (this also re-runs `tsc` per the `build` script, plus Vite bundling — catches anything `--noEmit` might miss, e.g. unused-import errors under stricter build settings).

- [ ] **Step 3: Manual smoke check (documented gap)**

A live click-through (Faol/Hammasi/Tarix tabs, creating a booking, editing a field from Settings) isn't practical in this session without a running backend + authenticated session — same caveat as the earlier fields.ts/media-upload work today. Note this to the user as an open follow-up rather than claiming it was verified live.
