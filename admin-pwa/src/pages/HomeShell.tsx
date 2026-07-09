import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import StatsPage from './StatsPage'
import BookingsListPage from './BookingsListPage'
import FieldsListPage from './FieldsListPage'
import NotificationsPage from './NotificationsPage'
import ProfilePage from './ProfilePage'

const tabs = [
  { to: 'stats', label: 'Asosiy', icon: DashboardIcon },
  { to: 'bookings', label: 'Bandliklar', icon: CalendarIcon },
  { to: 'fields', label: 'Maydonlar', icon: SoccerIcon },
  { to: 'profile', label: 'Profil', icon: SettingsIcon },
]

export default function HomeShell() {
  return (
    <div className="flex flex-col min-h-dvh bg-scaffold dark:bg-gray-900">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Routes>
          <Route index element={<Navigate to="stats" replace />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="bookings" element={<BookingsListPage />} />
          <Route path="fields" element={<FieldsListPage />} />
          {/* Not a bottom-nav tab — reached via the bell icon in each tab's TopBar */}
          <Route path="notifications" element={<NotificationsPage />} />
          {/* To'lov moved into Profil - keep the old link working */}
          <Route path="payments" element={<Navigate to="../profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
        </Routes>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex safe-bottom z-50">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon filled={isActive} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function DashboardIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={filled ? 0 : 1.8} fill={filled ? 'currentColor' : 'none'} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={filled ? 0 : 1.8} fill={filled ? 'currentColor' : 'none'} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={filled ? 0 : 1.8} fill={filled ? 'currentColor' : 'none'} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={filled ? 0 : 1.8} fill={filled ? 'currentColor' : 'none'} />
    </svg>
  )
}

function CalendarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect
        x="3" y="5" width="18" height="16" rx="2"
        stroke="currentColor" strokeWidth="1.8"
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.15 : 0}
      />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SoccerIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12" cy="12" r="9"
        stroke="currentColor"
        strokeWidth="1.8"
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.15 : 0}
      />
      <path
        d="M12 7l-2.5 2 1 3h3l1-3L12 7zM9.5 9L7 10.5M14.5 9L17 10.5M9.5 12H7.5l-1 3M14.5 12H16.5l1 3M9.5 15l1 2.5M14.5 15l-1 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill={filled ? 'currentColor' : 'none'} />
      <path
        d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
