# Gobron Superadmin

Web admin panel for Gobron operators. React 18 + Vite + TypeScript + Tailwind v4
+ TanStack Query + Recharts. Superadmin-only.

## Features

- **Dashboard** — total revenue, bookings, active fields, occupancy + Recharts
  (daily revenue area chart, popular-slots bar chart)
- **Maydonlar (Fields)** — table, create/edit modal with full **slot config**
  (opening/closing time, 30/60 slot duration, working days, price, peak pricing),
  one-click 14-day slot generation, delete
- **Maydon egalari (Field owners)** — table, create/edit modal (pick an
  existing `field_owner`-role user, business name, contact phone), verify, delete
- **Slotlar (per-field slot panel)** — from a field's row, drill into
  `/fields/:id/slots`: 14-day auto-generate, manual one-off slot, block/unblock
  (skips already-booked slots)
- **Foydalanuvchilar (Users)** — list users & admins, filter by role/blocked/search,
  change role, block/unblock, delete
- **Bronlar (Bookings)** — all bookings, filter by status
- **E'lonlar (Broadcasts)** — compose a bot post (text + optional image), send to
  all users, watch delivery counts (5s polling)

## Stack

Vite 6 · TanStack Query 5 · Axios (JWT + auto-refresh) · Zod (response validation)
· Tailwind v4 (Vite plugin) · lucide-react · Recharts · react-router-dom 6

## Structure

```
src/
  lib/        api (axios+tokens) · queryClient · format
  types/      zod schemas + inferred types
  hooks/      useAuth · useStats · useFields · useSlots · useFieldOwners · useUsers · useBookings · useBroadcasts
  components/ Sidebar · Layout · StatCard · FieldFormModal · FieldOwnerFormModal · ui atoms
  pages/      Login · Dashboard · Fields · FieldSlots · FieldOwners · Users · Bookings · Broadcasts
  App.tsx     login + superadmin-role gate
```

## Setup & run

```bash
cp .env.example .env      # point VITE_API_URL at the backend
npm install
npm run dev               # http://localhost:5173
npm run build             # type-check + production build
```

## Login

OTP login (phone + code). The backend must have a user with role `superadmin`;
in dev, OTP code `111111` is accepted. Seed a superadmin by creating a user then
`PATCH /admin/users/{id}/role?role=superadmin` (or set the role directly in DB).

## Notes

- Recharts makes the bundle ~210 KB gzip; fine for an internal tool. Code-split
  later if it matters.
