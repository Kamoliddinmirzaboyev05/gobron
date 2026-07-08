// ─── Auth ───────────────────────────────────────────────────────────────────

export interface TokenPair {
  access_token: string
  refresh_token: string
}

export interface AuthUser {
  id: string
  phone: string
  fullName?: string
}

// ─── Field ──────────────────────────────────────────────────────────────────

export interface Field {
  id?: string
  venueId?: string
  name: string
  description?: string
  address?: string
  openingTime?: string  // "HH:mm"
  closingTime?: string  // "HH:mm"
  slotDuration?: number // 30 | 60
  workingDays?: number[] // 0=Mon … 6=Sun
  pricePerHour: number
  pricePerSlot?: number
  size?: string
  surfaceType: 'open' | 'covered'
  images: string[]
  peakStartTime?: string
  peakPriceMultiplier: number
  isActive: boolean
  rating?: number
}

export const WEEKDAY_LABELS = ['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan', 'Yak']

// ─── Venue ──────────────────────────────────────────────────────────────────

export interface Venue {
  id?: string
  name: string
  address: string
  landmark?: string
  openingTime: string   // "HH:mm"
  closingTime: string   // "HH:mm"
  workingDays: number[]
  isActive: boolean
}

// ─── Booking ────────────────────────────────────────────────────────────────

export type BookingStatus = 'booked' | 'cancelled' | 'completed'

export interface Booking {
  id: string
  fieldId: string
  fieldName?: string
  customerName: string
  customerPhone: string
  date: string       // "YYYY-MM-DD"
  startTime: string  // "HH:mm"
  endTime: string    // "HH:mm"
  price: number
  status: BookingStatus
  note?: string
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardStats {
  todayRevenue: number
  weeklyRevenue: number
  monthlyRevenue: number
  todayBookingCount: number
  weeklyBookingCount: number
  monthlyBookingCount: number
  topFieldName?: string
}

// ─── Notification ───────────────────────────────────────────────────────────

export interface Notification {
  id: string
  title?: string
  body: string
  imageUrl?: string
  createdAt: string // ISO string
}

// ─── Manual Booking Input ───────────────────────────────────────────────────

export interface ManualBookingInput {
  fieldId: string
  date: string
  startTime: string
  endTime: string
  customerName: string
  customerPhone: string
  price: number
  note?: string
}
