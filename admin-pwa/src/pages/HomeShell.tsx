import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import StatsPage from './StatsPage'
import FieldsListPage from './FieldsListPage'
import NotificationsPage from './NotificationsPage'
import VenueSettingsPage from './VenueSettingsPage'

const tabs = [
  { to: 'stats', label: 'Asosiy', icon: DashboardIcon },
  { to: 'fields', label: 'Maydonlar', icon: SoccerIcon },
  { to: 'notifications', label: 'Bildirishnomalar', icon: BellIcon },
  { to: 'settings', label: 'Sozlamalar', icon: SettingsIcon },
]

export default function HomeShell() {
  return (
    <div className="flex flex-col min-h-dvh bg-scaffold">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route index element={<Navigate to="stats" replace />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="fields" element={<FieldsListPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<VenueSettingsPage />} />
        </Routes>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex safe-bottom z-50">
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

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 10a6 6 0 0112 0v3l2 2H4l2-2v-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
        fillOpacity={filled ? 0.15 : 0}
      />
      <path d="M10 17a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
