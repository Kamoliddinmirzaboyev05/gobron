// Centralised token storage — keeps localStorage in sync

const KEYS = {
  access: 'gobron_access_token',
  refresh: 'gobron_refresh_token',
  expiry: 'gobron_token_expiry',   // unix ms when access token expires
}

export const tokenStorage = {
  saveTokens(access: string, refresh: string, expiresInSecs = 3600) {
    localStorage.setItem(KEYS.access, access)
    localStorage.setItem(KEYS.refresh, refresh)
    localStorage.setItem(KEYS.expiry, String(Date.now() + expiresInSecs * 1000))
  },

  getAccessToken(): string | null {
    return localStorage.getItem(KEYS.access)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(KEYS.refresh)
  },

  /** True if we have an access token AND it hasn't expired yet */
  isAccessValid(): boolean {
    const token = localStorage.getItem(KEYS.access)
    const expiry = Number(localStorage.getItem(KEYS.expiry) ?? 0)
    return !!token && Date.now() < expiry - 30_000  // 30 s buffer
  },

  clear() {
    localStorage.removeItem(KEYS.access)
    localStorage.removeItem(KEYS.refresh)
    localStorage.removeItem(KEYS.expiry)
  },
}
