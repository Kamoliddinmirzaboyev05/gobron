import { create } from 'zustand'
import { tokenStorage } from '../api/client'
import { checkAuth } from '../api/auth'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  /** Run once at app start — refreshes token if needed */
  init: () => Promise<void>
  login: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',

  init: async () => {
    // Fast path: if no tokens at all, skip network call
    if (!tokenStorage.getRefreshToken() && !tokenStorage.getAccessToken()) {
      set({ status: 'unauthenticated' })
      return
    }
    const valid = await checkAuth()
    set({ status: valid ? 'authenticated' : 'unauthenticated' })
  },

  login: () => set({ status: 'authenticated' }),

  logout: () => {
    tokenStorage.clear()
    set({ status: 'unauthenticated' })
  },
}))
