import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from './tokenStorage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://gobronapi.webportfolio.uz/api/v1'

export { tokenStorage }

let _onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(fn: () => void) {
  _onSessionExpired = fn
}

// Separate instance for refresh calls — avoids infinite interceptor loops
const refreshAxios = axios.create({ baseURL: BASE_URL })

// Track a single in-flight refresh promise so concurrent 401s don't all trigger refresh
let refreshPromise: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  const rt = tokenStorage.getRefreshToken()
  if (!rt) return null
  try {
    const { data } = await refreshAxios.post('/auth/refresh', { refresh_token: rt })
    const expiresIn: number = data.expires_in ?? 3600
    tokenStorage.saveTokens(data.access_token, data.refresh_token, expiresIn)
    return data.access_token as string
  } catch {
    tokenStorage.clear()
    return null
  }
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

const api: AxiosInstance = axios.create({ baseURL: BASE_URL })

// Attach access token on every request
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 → try refresh once, then retry original request
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined
    if (error.response?.status === 401 && config && !config._retried) {
      config._retried = true

      // Use shared promise so concurrent requests don't all call refresh
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => { refreshPromise = null })
      }

      const newToken = await refreshPromise

      if (newToken) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${newToken}`
        return api(config)
      }

      // Refresh failed — session over
      _onSessionExpired?.()
    }
    return Promise.reject(error)
  }
)

export default api
