import { Link } from 'react-router-dom'

export default function TopBar({ title }: { title: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      <Link
        to="/home/notifications"
        aria-label="Bildirishnomalar"
        className="text-gray-500 dark:text-gray-300 p-1 -mr-1"
      >
        <BellIcon />
      </Link>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 10a6 6 0 0112 0v3l2 2H4l2-2v-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 17a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
