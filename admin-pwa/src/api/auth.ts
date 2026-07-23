import api, { tokenStorage } from './client'

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in?: number
}

export interface OwnerProfile {
  fullName: string
  phone: string | null
  createdAt: string // ISO
}

export async function fetchMe(): Promise<OwnerProfile> {
  const { data } = await api.get('/auth/me')
  return { fullName: data.full_name, phone: data.phone, createdAt: data.created_at }
}

async function phoneAuth(phone: string, password: string, fullName?: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/phone-login', {
    phone,
    password,
    full_name: fullName,
  })
  tokenStorage.saveTokens(data.access_token, data.refresh_token, data.expires_in ?? 86400)
  return data
}

/** New field owner: phone + name + password. */
export function registerWithPhone(phone: string, fullName: string, password: string) {
  return phoneAuth(phone, password, fullName)
}

/** Existing field owner: phone + password. */
export function loginWithPhone(phone: string, password: string) {
  return phoneAuth(phone, password)
}

/** Verify stored tokens are still valid; try refresh if access is expired */
export async function checkAuth(): Promise<boolean> {
  if (tokenStorage.isAccessValid()) return true

  const rt = tokenStorage.getRefreshToken()
  if (!rt) return false

  try {
    const { data } = await api.post<LoginResponse>('/auth/refresh', { refresh_token: rt })
    tokenStorage.saveTokens(data.access_token, data.refresh_token, data.expires_in ?? 86400)
    return true
  } catch {
    tokenStorage.clear()
    return false
  }
}
