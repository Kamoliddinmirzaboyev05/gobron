import { useState } from "react";
import { Star } from "lucide-react";
import { useMyBookings, useCancelBooking, useRateBooking } from "../hooks/useBookings";
import { BookingListSkeleton } from "../components/Skeleton";
import { Empty } from "../components/ui";
import { formatPrice, shortTime } from "../lib/format";
import type { Booking } from "../types";

const STATUS_STYLE: Record<Booking["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-pitch-100 text-pitch-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL: Record<Booking["status"], string> = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  cancelled: "Bekor qilingan",
  completed: "Yakunlangan",
};

const TABS = [
  { key: "confirmed", label: "Faol" },
  { key: "pending", label: "Kutilayotgan" },
  { key: "completed", label: "Tugallangan" },
  { key: "cancelled", label: "Bekor qilingan" },
] as const;

type Tab = (typeof TABS)[number]["key"];

function RatingStars({ booking }: { booking: Booking }) {
  const rate = useRateBooking();
  const current = booking.rating ?? 0;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="mb-1.5 text-xs font-medium text-gray-500">
        {current ? "Sizning bahoyingiz" : "Maydonni baholang"}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            aria-label={`${star} yulduz`}
            disabled={rate.isPending}
            onClick={() => rate.mutate({ bookingId: booking.id, rating: star })}
            className="disabled:opacity-50"
          >
            <Star
              className={`h-6 w-6 ${
                star <= current ? "fill-amber-400 text-amber-400" : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MyBookings() {
  const { data, isLoading } = useMyBookings();
  const cancel = useCancelBooking();
  const [tab, setTab] = useState<Tab>("confirmed");

  if (isLoading)
    return (
      <div className="px-4 py-4">
        <h1 className="mb-4 text-lg font-semibold">Mening bronlarim</h1>
        <BookingListSkeleton />
      </div>
    );
  if (!data || data.length === 0) return <Empty>Sizda hali bron yo'q</Empty>;

  const counts = data.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
  const visible = data.filter((b) => b.status === tab);

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">Mening bronlarim</h1>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.key
                ? "bg-pitch-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200"
            }`}
          >
            {t.label}
            {counts[t.key] ? ` (${counts[t.key]})` : ""}
          </button>
        ))}
      </div>

      {visible.length === 0 && <Empty>Bu bo'limda bron yo'q</Empty>}

      <div className="grid gap-3">
        {visible.map((b) => (
          <div key={b.id} className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
            <div className="flex items-start justify-between">
              <div>
                {b.slot && (
                  <p className="font-semibold">
                    {b.slot.slot_date} · {shortTime(b.slot.start_time)}–
                    {shortTime(b.slot.end_time)}
                  </p>
                )}
                <p className="mt-1 text-sm text-pitch-600">{formatPrice(b.total_price)}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[b.status]}`}
              >
                {STATUS_LABEL[b.status]}
              </span>
            </div>
            {(b.status === "pending" || b.status === "confirmed") && (
              <button
                onClick={() => cancel.mutate(b.id)}
                disabled={cancel.isPending}
                className="mt-3 w-full rounded-md border border-red-200 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
              >
                Bekor qilish
              </button>
            )}
            {b.status === "completed" && (
              <RatingStars booking={b} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
