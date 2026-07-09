export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />;
}

/** Mirrors FieldCard: 176px cover, then name/price/CTA row. */
export function FieldCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="flex items-end justify-between p-4">
        <div className="flex-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="mt-2 h-5 w-32" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function FieldListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <FieldCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Mirrors FieldDetail: hero image, title/address, description lines. */
export function FieldDetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="px-4 py-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-52" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-4/5" />
      </div>
    </div>
  );
}

/** Mirrors MyBookings rows: date/time, price, action button. */
export function BookingListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors BookingModal's slot grid. */
export function SlotGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}
