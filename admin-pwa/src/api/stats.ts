import api from './client'
import type { DashboardStats, Booking } from '../types'

export async function fetchStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/venue/stats')
  return data
}

export async function fetchTodayBookings(): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>('/venue/bookings/today')
  return data
}
