import { useState, useCallback } from 'react'
import { fetchStats, fetchTodayBookings } from '../api/stats'
import { createManualBooking } from '../api/bookings'
import { fetchFields } from '../api/fields'
import type { DashboardStats, Booking, Field, ManualBookingInput } from '../types'
import { useLoad } from '../hooks/useLoad'
import ManualBookingModal from '../components/ManualBookingModal'
import BookingTile from '../components/BookingTile'
import { StatsPageSkeleton } from '../components/Skeleton'

function formatSum(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm"
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
    () => fetchTodayBookings(),
    [refreshKey]
  )
  const { data: fields } = useLoad<Field[]>(() => fetchFields(), [])

  const loading = statsLoading || bookingsLoading

  async function handleCreateBooking(input: ManualBookingInput) {
    await createManualBooking(input)
    setShowBookingModal(false)
    refresh()
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* AppBar */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Asosiy</h1>
      </div>

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
              <h2 className="text-base font-semibold text-gray-800 mb-3">Bugungi bandliklar</h2>
              {todayBookings && todayBookings.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {todayBookings.map((b) => (
                    <BookingTile key={b.id} booking={b} />
                  ))}
                </div>
              ) : (
                <div className="card p-6 text-center text-gray-400 text-sm">
                  Bugun band qilinmagan
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowBookingModal(true)}
        className="fixed bottom-20 right-4 bg-primary text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
        aria-label="Band qilish"
      >
        <PlusIcon />
        <span className="sr-only">Band qilish</span>
      </button>

      {/* Manual Booking Modal */}
      {showBookingModal && (
        <ManualBookingModal
          fields={fields ?? []}
          onConfirm={handleCreateBooking}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-tile">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
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

