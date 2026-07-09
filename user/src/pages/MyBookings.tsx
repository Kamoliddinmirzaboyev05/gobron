import { useMyBookings, useCancelBooking } from "../hooks/useBookings";
import { Empty, Spinner } from "../components/ui";
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

export default function MyBookings() {
  const { data, isLoading } = useMyBookings();
  const cancel = useCancelBooking();

  if (isLoading) return <Spinner />;
  if (!data || data.length === 0) return <Empty>Sizda hali bron yo'q</Empty>;

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">Mening bronlarim</h1>
      <div className="grid gap-3">
        {data.map((b) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}
