import api from './client'
import type { Venue } from '../types'

interface VenueApi {
  id: number
  owner_id: number
  name: string
  address: string | null
  landmark: string | null
  latitude: number | null
  longitude: number | null
  opening_time: string
  closing_time: string
  working_days: number[]
  is_active: boolean
}

function fromApi(v: VenueApi): Venue {
  return {
    id: String(v.id),
    name: v.name,
    address: v.address ?? '',
    landmark: v.landmark ?? undefined,
    openingTime: (v.opening_time ?? '08:00').slice(0, 5),
    closingTime: (v.closing_time ?? '23:00').slice(0, 5),
    workingDays: v.working_days ?? [0, 1, 2, 3, 4, 5, 6],
    isActive: v.is_active ?? true,
  }
}

function toApi(venue: Partial<Venue>) {
  const body: Record<string, unknown> = {}
  if (venue.name !== undefined) body.name = venue.name
  if (venue.address !== undefined) body.address = venue.address
  if (venue.landmark !== undefined) body.landmark = venue.landmark || null
  if (venue.openingTime !== undefined) body.opening_time = venue.openingTime
  if (venue.closingTime !== undefined) body.closing_time = venue.closingTime
  if (venue.workingDays !== undefined) body.working_days = venue.workingDays
  if (venue.isActive !== undefined) body.is_active = venue.isActive
  return body
}

export async function fetchVenue(): Promise<Venue> {
  const { data } = await api.get<VenueApi>('/owner/venue')
  return fromApi(data)
}

export async function updateVenue(venue: Partial<Venue>): Promise<Venue> {
  const { data } = await api.put<VenueApi>('/owner/venue', toApi(venue))
  return fromApi(data)
}
