# Gobron User Web (Telegram Mini App)

Mobile-first booking app for players — the **Telegram Mini App (TMA)** front for
Gobron. React 18 + Vite + TypeScript + Tailwind v4 + TanStack Query.

## Features

- Home: hero, search, popular fields
- Fields list with filters (search, max price, min rating)
- Field detail: gallery, 14-day date picker, live available slots (15s polling)
- Booking with recurrence — **Bir marta / Har kuni / Har hafta**
- My Bookings (cancel) · Profile
- Auth: Telegram `initData` inside Telegram; OTP dev-login fallback in a browser

## Stack

| Concern      | Choice |
|--------------|--------|
| Build        | Vite 6 |
| Data/cache   | TanStack Query 5 |
| HTTP         | Axios (JWT + auto-refresh interceptor) |
| Validation   | Zod (parses every API response) |
| Styling      | Tailwind v4 (Vite plugin, no config file) |
| Icons        | lucide-react |
| Routing      | react-router-dom 6 |

## Structure

```
src/
  lib/        api (axios+tokens) · telegram · queryClient · format
  types/      zod schemas + inferred TS types
  hooks/      useAuth · useFields · useSlots · useBookings
  components/ Layout (bottom nav) · FieldCard · ui atoms
  pages/      Home · Fields · FieldDetail · MyBookings · Profile
  App.tsx     auth gate + routes
  main.tsx    providers + Telegram init
```

## Setup & run

```bash
cp .env.example .env      # point VITE_API_URL at the backend
npm install
npm run dev               # http://localhost:3000
npm run build             # type-check + production build
```

The backend must be running (see `gobron-backend`). In a normal browser the app
logs in via the OTP dev flow; inside Telegram it uses the signed `initData` that
the onboarding bot's WebApp button provides.

## Notes

- Payments (Click/Payme) and Favorites are not wired — no backend endpoints yet.
- Real-time availability uses 15s polling; swap for WebSocket later if needed.
