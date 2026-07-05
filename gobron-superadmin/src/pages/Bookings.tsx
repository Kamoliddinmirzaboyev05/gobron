import { useState } from "react";
import { useBookings } from "../hooks/useBookings";
import { Badge, Empty, Spinner } from "../components/ui";
import { formatPrice, shortTime } from "../lib/format";
import type { BookingStatus } from "../types";

const TABS: { value: BookingStatus | undefined; label: string }[] = [
  { value: undefined, label: "Barchasi" },
  { value: "pending", label: "Kutilmoqda" },
  { value: "confirmed", label: "Tasdiqlangan" },
  { value: "cancelled", label: "Bekor" },
  { value: "completed", label: "Yakunlangan" },
];

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  cancelled: "Bekor qilingan",
  completed: "Yakunlangan",
};

export default function Bookings() {
  const [status, setStatus] = useState<BookingStatus | undefined>();
  const { data, isLoading } = useBookings(status);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Bronlar</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setStatus(t.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              status === t.value ? "bg-pitch-600 text-white" : "bg-white text-gray-500 ring-1 ring-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <Empty>Bron topilmadi</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-left text-xs text-gray-400">
              <tr>
                <th className="px-4 py-3">Sana</th>
                <th className="px-4 py-3">Vaqt</th>
                <th className="px-4 py-3">Mijoz</th>
                <th className="px-4 py-3">Narx</th>
                <th className="px-4 py-3">Holat</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">{b.slot?.slot_date ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {b.slot ? `${shortTime(b.slot.start_time)}–${shortTime(b.slot.end_time)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {b.user ? [b.user.first_name, b.user.last_name].filter(Boolean).join(" ") || b.user.phone : "—"}
                  </td>
                  <td className="px-4 py-3">{formatPrice(b.total_price)}</td>
                  <td className="px-4 py-3"><Badge value={b.status} label={STATUS_LABEL[b.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
