import { create } from 'zustand'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'gobron-theme'

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function initial(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeState {
  theme: Theme
  toggle: () => void
}

const startTheme = initial()
apply(startTheme)

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: startTheme,
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    apply(next)
    set({ theme: next })
  },
}))
