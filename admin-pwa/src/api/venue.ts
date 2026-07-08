import api from './client'
import type { Venue } from '../types'

export async function fetchVenue(): Promise<Venue> {
  const { data } = await api.get<Venue>('/venue')
  return data
}

export async function updateVenue(venue: Partial<Venue>): Promise<Venue> {
  const { data } = await api.put<Venue>('/venue', venue)
  return data
}
