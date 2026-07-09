import type { Booking, BookingStatus } from '../types'

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending:   'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  confirmed: 'bg-blue-100  dark:bg-blue-900/40   text-blue-700   dark:text-blue-300',
  booked:    'bg-green-100 dark:bg-green-900/40  text-green-700  dark:text-green-300',
  cancelled: 'bg-red-100   dark:bg-red-900/40    text-red-600    dark:text-red-300',
  completed: 'bg-gray-100  dark:bg-gray-700      text-gray-500   dark:text-gray-300',
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending:   'Kutilmoqda',
  confirmed: 'Tasdiqlangan',
  booked:    'Band qilingan',
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
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{b.customerName}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 truncate">{b.customerPhone}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {b.date} · {b.startTime}–{b.endTime}
        </p>
        {b.fieldName && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{b.fieldName}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className="font-semibold text-primary text-sm">{formatSum(b.price)}</p>
        <span className={`chip ${STATUS_STYLES[b.status]}`}>
          {STATUS_LABELS[b.status]}
        </span>
        {b.source === 'player' && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">Ilova orqali</span>
        )}
      </div>
    </div>
  )
}
