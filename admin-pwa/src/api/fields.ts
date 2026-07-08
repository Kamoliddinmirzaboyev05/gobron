import api from './client'
import type { Field } from '../types'

interface OwnerFieldApi {
  id: number
  venue_id: number
  name: string
  size: string | null
  surface_type: 'open' | 'covered'
  price_per_hour: number
  images: string[]
  is_active: boolean
  booking_window_days: number
}

function fromApi(f: OwnerFieldApi): Field {
  return {
    id: String(f.id),
    venueId: String(f.venue_id),
    name: f.name,
    size: f.size ?? undefined,
    surfaceType: f.surface_type,
    pricePerHour: f.price_per_hour,
    images: f.images,
    isActive: f.is_active,
    peakPriceMultiplier: 1.0,
    bookingWindowDays: f.booking_window_days,
  }
}

function toApi(field: Omit<Field, 'id' | 'venueId'>) {
  return {
    name: field.name,
    size: field.size || null,
    surface_type: field.surfaceType,
    price_per_hour: field.pricePerHour,
    images: field.images,
    is_active: field.isActive,
    booking_window_days: field.bookingWindowDays,
  }
}

export async function fetchFields(): Promise<Field[]> {
  const { data } = await api.get<OwnerFieldApi[]>('/owner/fields')
  return data.map(fromApi)
}

export async function createField(field: Omit<Field, 'id' | 'venueId'>): Promise<Field> {
  const { data } = await api.post<OwnerFieldApi>('/owner/fields', toApi(field))
  return fromApi(data)
}

export async function updateField(id: string, field: Omit<Field, 'id' | 'venueId'>): Promise<Field> {
  const { data } = await api.patch<OwnerFieldApi>(`/owner/fields/${id}`, toApi(field))
  return fromApi(data)
}
