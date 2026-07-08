import { useState, useCallback } from 'react'
import { fetchBookings } from '../api/bookings'
import { fetchFields } from '../api/fields'
import type { Booking, Field } from '../types'
import { useLoad } from '../hooks/useLoad'
import SlotBookingModal from '../components/SlotBookingModal'
import BookingTile from '../components/BookingTile'
import TopBar from '../components/TopBar'

type Bucket = 'faol' | 'hammasi' | 'tarix'

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'faol', label: 'Faol' },
  { key: 'hammasi', label: 'Hammasi' },
  { key: 'tarix', label: 'Tarix' },
]

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function matchesBucket(b: Booking, bucket: Bucket, today: string): boolean {
  if (bucket === 'hammasi') return true
  const isUpcoming = b.status === 'booked' && b.date >= today
  return bucket === 'faol' ? isUpcoming : !isUpcoming
}

const EMPTY_LABEL: Record<Bucket, string> = {
  faol: "Faol bandliklar yo'q",
  hammasi: "Bandliklar yo'q",
  tarix: "Tarix bo'sh",
}

export default function BookingsListPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [bucket, setBucket] = useState<Bucket>('faol')
  const [showBookingModal, setShowBookingModal] = useState(false)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const { data: bookings, loading } = useLoad<Booking[]>(() => fetchBookings(), [refreshKey])
  const { data: fields } = useLoad<Field[]>(() => fetchFields(), [])

  const fieldNameById = new Map((fields ?? []).map((f) => [f.id, f.name]))
  const today = todayString()
  const filtered = (bookings ?? []).filter((b) => matchesBucket(b, bucket, today))

  function handleBooked() {
    setShowBookingModal(false)
    setBucket('faol')
    refresh()
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Bandliklar" />

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        {BUCKETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setBucket(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
              bucket === key
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && !bookings ? (
          <div className="card p-6 text-center text-gray-400 dark:text-gray-500 text-sm">Yuklanmoqda...</div>
        ) : filtered.length > 0 ? (
          <div className="flex flex-col gap-2">
            {filtered.map((b) => (
              <BookingTile
                key={b.id}
                booking={{ ...b, fieldName: fieldNameById.get(b.fieldId) }}
              />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-400 dark:text-gray-500">
            <p>{EMPTY_LABEL[bucket]}</p>
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
