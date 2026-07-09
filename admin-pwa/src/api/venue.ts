import api from './client'
import type { Venue } from '../types'

export async function fetchVenue(): Promise<Venue> {
  const { data } = await api.get<Venue>('/owner/venue')
  return data
}

export async function updateVenue(venue: Partial<Venue>): Promise<Venue> {
  const { data } = await api.put<Venue>('/owner/venue', venue)
  return data
}
