import type { Booking, BookingStatus } from '../types'

const STATUS_STYLES: Record<BookingStatus, string> = {
  booked: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  booked: 'Band qilingan',
  cancelled: 'Bekor qilingan',
  completed: 'Tugallangan',
}

function formatSum(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so’m"
}

export default function BookingTile({ booking: b }: { booking: Booking }) {
  const initials = b.customerName
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="card flex items-center gap-3 p-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-semibold text-sm">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{b.customerName}</p>
        <p className="text-sm text-gray-500">
          {b.date} · {b.startTime}–{b.endTime}
        </p>
        {b.fieldName && (
          <p className="text-xs text-gray-400 truncate">{b.fieldName}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className="font-semibold text-primary text-sm">{formatSum(b.price)}</p>
        <span className={`chip ${STATUS_STYLES[b.status]}`}>
          {STATUS_LABELS[b.status]}
        </span>
      </div>
    </div>
  )
}
