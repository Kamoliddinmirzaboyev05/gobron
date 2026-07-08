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
