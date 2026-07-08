import api from './client'
import type { Notification } from '../types'

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>('/venue/notifications')
  return data
}
