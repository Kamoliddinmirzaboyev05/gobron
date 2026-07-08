import api from './client'
import type { Booking, ManualBookingInput } from '../types'

export async function fetchBookings(period: 'today' | 'upcoming'): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>('/venue/bookings', { params: { period } })
  return data
}

export async function createManualBooking(input: ManualBookingInput): Promise<Booking> {
  const { data } = await api.post<Booking>('/venue/bookings/manual', input)
  return data
}
