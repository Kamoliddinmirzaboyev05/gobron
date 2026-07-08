import { fetchMe, OwnerProfile } from '../api/auth'
import { fetchFields } from '../api/fields'
import type { Field } from '../types'
import { useLoad } from '../hooks/useLoad'
import { useAuthStore } from '../store/auth'
import { useThemeStore } from '../store/theme'
import { useNotificationPrefsStore } from '../store/notificationPrefs'
import { getSubscriptionStatus } from '../utils/subscription'
import { formatUzPhone, extractPhoneDigits } from '../utils/phone'
import { SoccerIcon } from '../components/BrandIcons'
import TopBar from '../components/TopBar'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'

export default function ProfilePage() {
  const logout = useAuthStore((s) => s.logout)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const notificationsEnabled = useNotificationPrefsStore((s) => s.enabled)
  const toggleNotifications = useNotificationPrefsStore((s) => s.toggle)

  const { data: profile } = useLoad<OwnerProfile>(() => fetchMe(), [])
  const { data: fields } = useLoad<Field[]>(() => fetchFields(), [])
  const monthlyPrice = fields?.[0]?.pricePerHour ?? 0
  const subscription = profile ? getSubscriptionStatus(profile.createdAt) : null

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Profil" />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Avatar + identity */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
            <SoccerIcon size={80} />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{profile?.fullName || '—'}</p>
            <p className="text-gray-500 dark:text-gray-400">
              {profile?.phone ? formatUzPhone(extractPhoneDigits(profile.phone)) : '—'}
            </p>
          </div>
        </div>

        {/* Subscription */}
        {subscription && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {subscription.isTrial ? 'Bepul sinov davri' : 'Oylik obuna'}
              </p>
              <span
                className={`chip ${
                  subscription.isTrial
                    ? 'bg-primary-light text-primary'
                    : 'bg-primary text-white'
                }`}
              >
                {subscription.isTrial ? 'Bepul' : 'Faol'}
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${((subscription.totalDays - subscription.daysLeft) / subscription.totalDays) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{subscription.daysLeft} kun qoldi</span>
              <span>{format(subscription.nextPaymentDate, 'd MMM yyyy', { locale: uz })}</span>
            </div>

            {!subscription.isTrial && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Keyingi to'lov: <span className="font-medium text-gray-900 dark:text-gray-100">{monthlyPrice.toLocaleString('uz-UZ')} so'm</span>
              </p>
            )}
          </div>
        )}

        {/* Preferences */}
        <div className="card divide-y divide-gray-100 dark:divide-gray-700">
          <ToggleRow
            label="Bildirishnomalar"
            sub="Push xabarlarni qabul qilish"
            checked={notificationsEnabled}
            onChange={toggleNotifications}
          />
          <ToggleRow
            label="Tungi rejim"
            sub="Ilova ko'rinishi"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
        </div>

        <button
          onClick={logout}
          className="w-full bg-red-500 text-white font-semibold py-3.5 rounded-btn active:opacity-90 transition-opacity"
        >
          Chiqish
        </button>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string
  sub: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{sub}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
