import api from './client'
import type { Notification } from '../types'

/** GET /owner/notifications returns Broadcast rows (audience: field_owners | all). */
interface BroadcastApi {
  id: number
  text: string
  image_url: string | null
  created_at: string
}

function fromApi(b: BroadcastApi): Notification {
  return {
    id: String(b.id),
    body: b.text,
    imageUrl: b.image_url ?? undefined,
    createdAt: b.created_at,
  }
}

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await api.get<BroadcastApi[]>('/owner/notifications')
  return data.map(fromApi)
}
