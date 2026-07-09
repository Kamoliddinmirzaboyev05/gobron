import { useState, useCallback } from 'react'
import { fetchStats } from '../api/stats'
import { acceptRequest, extendBooking, fetchBookingsByDate, rejectRequest } from '../api/bookings'
import { fetchFields } from '../api/fields'
import type { DashboardStats, Booking, Field } from '../types'
import { useLoad } from '../hooks/useLoad'
import BookingTile from '../components/BookingTile'
import { StatsPageSkeleton } from '../components/Skeleton'
import TopBar from '../components/TopBar'
import SlotBookingModal from '../components/SlotBookingModal'

function formatSum(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm"
}

const UPCOMING_LIMIT = 3
// Cancelled and finished bookings are history; the dashboard is about what's
// still coming (including a request waiting to be accepted).
const LIVE_STATUSES = ['pending', 'confirmed', 'booked']

function currentHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function upcomingBookings(bookings: Booking[] | null): Booking[] {
  const now = currentHHMM()
  return (bookings ?? [])
    .filter((b) => LIVE_STATUSES.includes(b.status) && b.endTime > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, UPCOMING_LIMIT)
}

export default function StatsPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showBookingModal, setShowBookingModal] = useState(false)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const { data: stats, loading: statsLoading } = useLoad<DashboardStats>(
    () => fetchStats(),
    [refreshKey]
  )
  const { data: todayBookings, loading: bookingsLoading } = useLoad<Booking[]>(
    () => fetchBookingsByDate(new Date().toISOString().split('T')[0]),
    [refreshKey]
  )
  const { data: fields } = useLoad<Field[]>(() => fetchFields(), [])

  const loading = statsLoading || bookingsLoading
  const upcoming = upcomingBookings(todayBookings)

  function handleBooked() {
    setShowBookingModal(false)
    refresh()
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Asosiy" />

      {/* Pull-to-refresh area */}
      <div className="flex-1 overflow-y-auto">
        {loading && !stats ? (
          <StatsPageSkeleton />
        ) : (
          <div className="p-4 flex flex-col gap-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Bugun"
                value={formatSum(stats?.todayRevenue ?? 0)}
                sub={`${stats?.todayBookingCount ?? 0} ta band`}
              />
              <StatTile
                label="Hafta"
                value={formatSum(stats?.weeklyRevenue ?? 0)}
                sub={`${stats?.weeklyBookingCount ?? 0} ta band`}
              />
              <StatTile
                label="Oy"
                value={formatSum(stats?.monthlyRevenue ?? 0)}
                sub={`${stats?.monthlyBookingCount ?? 0} ta band`}
              />
              <StatTile
                label="Bugungi bandlik"
                value={`${stats?.todayBookingCount ?? 0}`}
                sub={stats?.topFieldName ? `Top: ${stats.topFieldName}` : ''}
              />
            </div>

            {/* Today's Bookings */}
            <section>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">Yaqinlashib kelayotgan</h2>
              {upcoming.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {upcoming.map((b) => (
                    <BookingTile
                      key={`${b.source}-${b.id}`}
                      booking={b}
                      onAccept={async (id) => {
                        await acceptRequest(id)
                        refresh()
                      }}
                      onReject={async (id) => {
                        await rejectRequest(id)
                        refresh()
                      }}
                      onExtend={async (minutes) => {
                        await extendBooking(b.source, b.id, minutes)
                        refresh()
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="card p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                  Yaqin bandlik yo'q
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowBookingModal(true)}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 bg-primary text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
        aria-label="Band qilish"
      >
        <PlusIcon />
      </button>

      {showBookingModal && (
        <SlotBookingModal
          fields={fields ?? []}
          onBooked={handleBooked}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-tile">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  )
}


