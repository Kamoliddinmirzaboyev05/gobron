import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { X, Check } from "lucide-react";
import { useSlots } from "../hooks/useSlots";
import { useCreateBooking } from "../hooks/useBookings";
import { formatPrice, nextDays, shortTime } from "../lib/format";
import { SlotGridSkeleton } from "./Skeleton";
import { Empty } from "./ui";
import type { Field, RecurrenceType, Slot } from "../types";

const RECURRENCE: { value: RecurrenceType; label: string }[] = [
  { value: "once", label: "Bir marta" },
  { value: "daily", label: "Har kuni" },
  { value: "weekly", label: "Har hafta" },
];

function dayLabel(index: number, label: string): string {
  if (index === 0) return "Bugun";
  if (index === 1) return "Ertaga";
  return label;
}

/** Is `b` immediately after `a` on the same day (a.end_time === b.start_time)? */
function isAdjacent(a: Slot, b: Slot): boolean {
  return a.slot_date === b.slot_date && a.end_time === b.start_time;
}

export default function BookingModal({
  fields,
  initialFieldId,
  onClose,
}: {
  fields: Field[];
  initialFieldId: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [fieldId, setFieldId] = useState(initialFieldId);

  // Each field's owner decides how far ahead players may book (1 = today only).
  const windowDays = fields.find((f) => f.id === fieldId)?.booking_window_days ?? 1;
  const days = useMemo(() => nextDays(Math.max(1, windowDays)), [windowDays]);
  const [date, setDate] = useState(() => nextDays(1)[0].iso);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [occurrences, setOccurrences] = useState(4);

  const { data: slots, isLoading } = useSlots(fieldId, date);
  const createBooking = useCreateBooking();

  const selected = useMemo(
    () =>
      (slots ?? [])
        .filter((s) => selectedIds.includes(s.id))
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slots, selectedIds],
  );

  function toggleSlot(slot: Slot) {
    if (selectedIds.includes(slot.id)) {
      const first = selected[0];
      const last = selected[selected.length - 1];
      if (slot.id === first?.id || slot.id === last?.id) {
        setSelectedIds((ids) => ids.filter((id) => id !== slot.id));
      } else {
        setSelectedIds([slot.id]); // mid-selection tap: start fresh
      }
      return;
    }
    if (selected.length === 0) {
      setSelectedIds([slot.id]);
      return;
    }
    const first = selected[0];
    const last = selected[selected.length - 1];
    if (isAdjacent(last, slot) || isAdjacent(slot, first)) {
      setSelectedIds((ids) => [...ids, slot.id]);
    } else {
      setSelectedIds([slot.id]); // non-adjacent tap: start fresh
    }
  }

  function switchField(id: number) {
    setFieldId(id);
    setSelectedIds([]);
    // The new field may have a shorter window than the currently picked date.
    setDate(nextDays(1)[0].iso);
  }

  function switchDate(iso: string) {
    setDate(iso);
    setSelectedIds([]);
  }

  const total =
    recurrence !== "once" && selected.length === 1
      ? selected[0].price * occurrences
      : selected.reduce((sum, s) => sum + s.price, 0);

  async function confirm() {
    if (selected.length === 0) return;
    await createBooking.mutateAsync({
      slot_ids: selected.map((s) => s.id),
      recurrence_type: recurrence,
      occurrences: recurrence === "once" ? 1 : occurrences,
    });
    onClose();
    navigate("/bookings");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="text-lg font-bold">Band qilish</h2>
          <button onClick={onClose} className="text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          {fields.length > 1 && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Maydon</h3>
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => switchField(f.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                      f.id === fieldId ? "bg-pitch-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <h3 className="mb-2 text-sm font-semibold text-gray-700">Sana</h3>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {days.map((d, i) => (
              <button
                key={d.iso}
                onClick={() => switchDate(d.iso)}
                className={`flex min-w-16 shrink-0 flex-col items-center rounded-lg px-3 py-2 text-sm ${
                  d.iso === date ? "bg-pitch-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
                }`}
              >
                {dayLabel(i, `${d.label}, ${d.weekday}`)}
              </button>
            ))}
          </div>

          <h3 className="mb-2 text-sm font-semibold text-gray-700">Vaqt</h3>
          {isLoading ? (
            <SlotGridSkeleton />
          ) : slots && slots.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSlot(s)}
                  className={`rounded-lg py-3 text-sm font-medium ring-1 ${
                    selectedIds.includes(s.id)
                      ? "bg-pitch-600 text-white ring-pitch-600"
                      : "bg-white text-gray-700 ring-gray-200"
                  }`}
                >
                  {shortTime(s.start_time)}-{shortTime(s.end_time)}
                </button>
              ))}
            </div>
          ) : (
            <Empty>Bu kunda bo'sh vaqt yo'q</Empty>
          )}

          {selected.length === 1 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold text-gray-700">Takrorlanish</h3>
              <div className="flex gap-2">
                {RECURRENCE.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRecurrence(r.value)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium ring-1 ${
                      recurrence === r.value
                        ? "bg-pitch-600 text-white ring-pitch-600"
                        : "bg-white text-gray-600 ring-gray-200"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {recurrence !== "once" && (
                <label className="mt-3 flex items-center justify-between text-sm text-gray-600">
                  Necha marta?
                  <input
                    type="number"
                    min={2}
                    max={12}
                    value={occurrences}
                    onChange={(e) => setOccurrences(Math.max(2, Number(e.target.value)))}
                    className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-right"
                  />
                </label>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4">
          {createBooking.isError && (
            <p className="mb-2 text-center text-xs text-red-600">
              {isAxiosError(createBooking.error) && typeof createBooking.error.response?.data?.detail === "string"
                ? createBooking.error.response.data.detail
                : "Tanlangan vaqt band bo'lib qoldi. Boshqa vaqt tanlang."}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div>
              {selected.length > 0 && (
                <p className="text-xs text-gray-400">
                  {shortTime(selected[0].start_time)}–{shortTime(selected[selected.length - 1].end_time)}
                </p>
              )}
              <p className="text-lg font-bold text-pitch-600">{formatPrice(total)}</p>
            </div>
            <button
              onClick={confirm}
              disabled={selected.length === 0 || createBooking.isPending}
              className="flex items-center gap-2 rounded-lg bg-pitch-600 px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              <Check className="h-5 w-5" />
              {createBooking.isPending ? "..." : "So'rov yuborish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
