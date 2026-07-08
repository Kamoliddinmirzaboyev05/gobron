import api from './client'
import type { Field } from '../types'

export async function fetchFields(): Promise<Field[]> {
  const { data } = await api.get<Field[]>('/venue/fields')
  return data
}

export async function createField(field: Omit<Field, 'id' | 'venueId'>): Promise<Field> {
  const { data } = await api.post<Field>('/venue/fields', field)
  return data
}

export async function updateField(id: string, field: Partial<Field>): Promise<Field> {
  const { data } = await api.put<Field>(`/venue/fields/${id}`, field)
  return data
}
