import { useState, useEffect } from 'react'
import { fetchNotifications } from '../api/notifications'
import { fetchRequests, acceptRequest, rejectRequest } from '../api/bookings'
import type { Notification, AdminBookingRequest } from '../types'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'
import { NotificationsListSkeleton } from '../components/Skeleton'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [requests, setRequests] = useState<AdminBookingRequest[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    try {
      const [nots, reqs] = await Promise.all([
        fetchNotifications(),
        fetchRequests()
      ])
      setNotifications(nots)
      setRequests(reqs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // Keep an open requests screen fresh; Web Push covers the app-closed case.
    const id = setInterval(loadData, 15_000)
    return () => clearInterval(id)
  }, [])

  async function handleAccept(id: string) {
    await acceptRequest(id)
    loadData()
  }

  async function handleReject(id: string) {
    await rejectRequest(id)
    loadData()
  }

  const isEmpty = notifications.length === 0 && requests.length === 0

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bildirishnomalar</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <NotificationsListSkeleton />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 dark:text-gray-500 gap-2">
            <BellOffIcon />
            <p>Hozircha bildirishnoma yo'q</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {requests.map((r) => (
              <RequestItem 
                key={`req-${r.id}`} 
                request={r} 
                onAccept={() => handleAccept(r.id)} 
                onReject={() => handleReject(r.id)} 
              />
            ))}
            {notifications.map((n) => (
              <NotificationItem key={`not-${n.id}`} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RequestItem({ request: r, onAccept, onReject }: { request: AdminBookingRequest, onAccept: () => void, onReject: () => void }) {
  const dateStr = (() => {
    try {
      return format(new Date(r.createdAt), 'd MMM, HH:mm', { locale: uz })
    } catch {
      return r.createdAt
    }
  })()

  const slotDate = r.slot ? format(new Date(r.slot.slot_date), 'd MMM', { locale: uz }) : ''

  return (
    <div className="bg-white dark:bg-gray-800 px-4 py-3">
      <div className="flex justify-between items-start mb-2">
        <p className="font-semibold text-gray-900 dark:text-gray-100">Yangi band qilish so'rovi</p>
        <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr}</span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
        <span className="font-medium">{r.user?.firstName || 'Mijoz'}</span> so'rov yubordi.
      </p>
      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 mb-3">
        {slotDate} kuni {r.slot?.start_time.slice(0, 5)} - {r.slot?.end_time.slice(0, 5)}
        <br />
        Tel: {r.user?.phone}
      </div>
      <div className="flex gap-2">
        <button onClick={onAccept} className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
          Qabul qilish
        </button>
        <button onClick={onReject} className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 py-2 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
          Rad etish
        </button>
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
    <div className="bg-white dark:bg-gray-800">
      {n.imageUrl && (
        <img
          src={n.imageUrl}
          alt=""
          className="w-full h-[150px] object-cover"
        />
      )}
      <div className="px-4 py-3">
        {n.title && (
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">{n.title}</p>
        )}
        <p className="text-sm text-gray-700 dark:text-gray-300">{n.body}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dateStr}</p>
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
