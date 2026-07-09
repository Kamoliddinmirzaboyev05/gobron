import { create } from 'zustand'
import { disablePush, enablePush } from '../api/push'

const STORAGE_KEY = 'gobron-notifications-enabled'

interface NotificationPrefsState {
  enabled: boolean
  toggle: () => Promise<void>
  /** Re-register this device on app start when the pref is already on. */
  sync: () => Promise<void>
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  enabled: localStorage.getItem(STORAGE_KEY) === 'on',

  toggle: async () => {
    const next = !get().enabled
    if (next) {
      // The browser may refuse (permission denied / unsupported); don't flip
      // the pref on in that case or the UI would lie about what's happening.
      const ok = await enablePush()
      if (!ok) return
    } else {
      await disablePush()
    }
    localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
    set({ enabled: next })
  },

  sync: async () => {
    if (!get().enabled) return
    const ok = await enablePush()
    if (!ok) {
      localStorage.setItem(STORAGE_KEY, 'off')
      set({ enabled: false })
    }
  },
}))
