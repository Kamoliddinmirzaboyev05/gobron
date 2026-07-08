// ─── Base skeleton block ─────────────────────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
    />
  )
}

// ─── Stat tile skeleton ───────────────────────────────────────────────────────

export function StatTileSkeleton() {
  return (
    <div className="stat-tile gap-2">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

// ─── Stats page skeleton ─────────────────────────────────────────────────────

export function StatsPageSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
      <div>
        <Skeleton className="h-5 w-40 mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <BookingTileSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Booking tile skeleton ────────────────────────────────────────────────────

export function BookingTileSkeleton() {
  return (
    <div className="card flex items-center gap-3 p-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}

// ─── Field card skeleton ──────────────────────────────────────────────────────

export function FieldCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="w-full h-36 rounded-none" />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </div>
    </div>
  )
}

export function FieldsListSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <FieldCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Notification skeleton ────────────────────────────────────────────────────

export function NotificationItemSkeleton() {
  return (
    <div className="bg-white border-b border-gray-100">
      <Skeleton className="w-full h-[150px] rounded-none" />
      <div className="px-4 py-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-20 mt-1" />
      </div>
    </div>
  )
}

export function NotificationsListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 4 }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Venue settings skeleton ──────────────────────────────────────────────────

export function VenueSettingsSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="h-3 w-20 mb-3" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-12 rounded-full" />
          ))}
        </div>
      </div>
      <div className="card px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-btn" />
    </div>
  )
}
