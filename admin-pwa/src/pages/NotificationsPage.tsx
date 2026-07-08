import { } from 'react'
import { fetchNotifications } from '../api/notifications'
import type { Notification } from '../types'
import { useLoad } from '../hooks/useLoad'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'
import { NotificationsListSkeleton } from '../components/Skeleton'

export default function NotificationsPage() {
  const { data: notifications, loading } = useLoad<Notification[]>(
    () => fetchNotifications(),
    []
  )

  return (
    <div className="flex flex-col min-h-full">
      {/* AppBar */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Bildirishnomalar</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && !notifications ? (
          <NotificationsListSkeleton />
        ) : !notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-2">
            <BellOffIcon />
            <p>Hozircha bildirishnoma yo'q</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  const dateStr = (() => {
    try {
      return format(new Date(n.createdAt), 'd MMM, HH:mm', { locale: uz })
    } catch {
      return n.createdAt
    }
  })()

  return (
    <div className="bg-white">
      {n.imageUrl && (
        <img
          src={n.imageUrl}
          alt=""
          className="w-full h-[150px] object-cover"
        />
      )}
      <div className="px-4 py-3">
        {n.title && (
          <p className="font-semibold text-gray-900 mb-0.5">{n.title}</p>
        )}
        <p className="text-sm text-gray-700">{n.body}</p>
        <p className="text-xs text-gray-400 mt-1">{dateStr}</p>
      </div>
    </div>
  )
}

function BellOffIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 10a6 6 0 0112 0v3l2 2H4l2-2v-3zM10 17a2 2 0 004 0M3 3l18 18"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
