import { create } from 'zustand'

const STORAGE_KEY = 'gobron-notifications-enabled'

interface NotificationPrefsState {
  enabled: boolean
  toggle: () => void
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  enabled: localStorage.getItem(STORAGE_KEY) !== 'off',
  toggle: () => {
    const next = !get().enabled
    localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
    set({ enabled: next })
  },
}))
