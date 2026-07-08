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

export async function fetchRequests(): Promise<any[]> {
  const { data } = await api.get('/owner/requests')
  return data
}

export async function acceptRequest(bookingId: string): Promise<any> {
  const { data } = await api.post(`/owner/requests/${bookingId}/accept`)
  return data
}

export async function rejectRequest(bookingId: string): Promise<any> {
  const { data } = await api.post(`/owner/requests/${bookingId}/reject`)
  return data
}
