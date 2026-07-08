import api, { tokenStorage } from './client'

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in?: number
}

export async function loginWithPhone(phone: string, fullName?: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    phone,
    full_name: fullName,
  })
  tokenStorage.saveTokens(data.access_token, data.refresh_token, data.expires_in ?? 3600)
  return data
}

/** Verify stored tokens are still valid; try refresh if access is expired */
export async function checkAuth(): Promise<boolean> {
  if (tokenStorage.isAccessValid()) return true

  const rt = tokenStorage.getRefreshToken()
  if (!rt) return false

  try {
    const { data } = await api.post<LoginResponse>('/auth/refresh', { refresh_token: rt })
    tokenStorage.saveTokens(data.access_token, data.refresh_token, data.expires_in ?? 3600)
    return true
  } catch {
    tokenStorage.clear()
    return false
  }
}
