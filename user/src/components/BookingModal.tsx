import { useEffect, useMemo, useRef, useState } from "react";
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
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const [fieldId, setFieldId] = useState(initialFieldId);

  // showModal() (not the `open` attribute) is what puts the sheet in the top
  // layer, above the fixed bottom nav.
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // Never dialog.close() directly: that unmounts us before the sheet has slid
  // out. Play the exit first, and let animationend do the unmounting.
  const dismiss = () => setClosing(true);

  // Each field's owner decides how far ahead players may book (1 = today only).
  const windowDays = fields.find((f) => f.id === fieldId)?.booking_window_days ?? 1;
  const days = useMemo(() => nextDays(Math.max(1, windowDays)), [windowDays]);
  const [date, setDate] = useState(() => nextDays(1)[0].iso);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [occurrences, setOccurrences] = useState(4);

  // isPlaceholderData: the grid on screen still belongs to the previous
  // field/date. Keep it visible (no height jump) but don't let it be tapped.
  const { data: slots, isLoading, isPlaceholderData } = useSlots(fieldId, date);
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

  // A multi-hour block can't also repeat - the backend rejects it - so the
  // picked recurrence only counts while exactly one slot is selected.
  const canRepeat = selected.length === 1;
  const effectiveRecurrence = canRepeat ? recurrence : "once";

  const total =
    effectiveRecurrence !== "once"
      ? selected[0].price * occurrences
      : selected.reduce((sum, s) => sum + s.price, 0);

  async function confirm() {
    if (selected.length === 0) return;
    await createBooking.mutateAsync({
      slot_ids: selected.map((s) => s.id),
      recurrence_type: effectiveRecurrence,
      occurrences: effectiveRecurrence === "once" ? 1 : occurrences,
    });
    onClose();
    navigate("/bookings");
  }

  return (
    <dialog
      ref={ref}
      // Esc would close the dialog outright; intercept it so it exits like a tap.
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      // The dialog box fills the viewport, so a tap outside the sheet targets it.
      onClick={(e) => e.target === ref.current && dismiss()}
      className={`fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none items-end justify-center overflow-hidden bg-transparent p-0 backdrop:bg-black/40 open:flex ${
        closing ? "backdrop:animate-fade-out" : "backdrop:animate-fade-in"
      }`}
    >
      <div
        // Bound only while closing, so the entrance animation ending can't
        // unmount the sheet the moment it finishes opening. The target check
        // ignores animations bubbling up from children.
        onAnimationEnd={closing ? (e) => e.target === e.currentTarget && onClose() : undefined}
        // A fixed height (not max-h) is what stops the sheet resizing every
        // time the slot count changes; the body scrolls instead.
        className={`flex h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white ${
          closing ? "animate-sheet-out" : "animate-sheet-in"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold">Band qilish</h2>
          <button onClick={dismiss} className="text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {fields.length > 1 && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Maydon</h3>
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => switchField(f.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
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
                className={`flex min-w-16 shrink-0 flex-col items-center rounded-lg px-3 py-2 text-sm transition-colors ${
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
            <div
              className={`grid grid-cols-2 gap-2 transition-opacity ${
                isPlaceholderData ? "pointer-events-none opacity-50" : "opacity-100"
              }`}
            >
              {slots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSlot(s)}
                  className={`rounded-lg py-3 text-sm font-medium ring-1 transition-colors active:scale-[0.98] ${
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

          {/* Always mounted: popping in on the 1st slot and out on the 2nd
              made the sheet jump under the user's finger. Repeating only
              makes sense for a single slot, so it just disables instead. */}
          <div className={canRepeat ? "" : "pointer-events-none opacity-40"}>
            <h3 className="mb-2 mt-5 text-sm font-semibold text-gray-700">Takrorlanish</h3>
            <div className="flex gap-2">
              {RECURRENCE.map((r) => (
                <button
                  key={r.value}
                  disabled={!canRepeat}
                  onClick={() => setRecurrence(r.value)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium ring-1 transition-colors ${
                    recurrence === r.value
                      ? "bg-pitch-600 text-white ring-pitch-600"
                      : "bg-white text-gray-600 ring-gray-200"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {/* Reserve the row so ticking "Har kuni" doesn't shift the sheet. */}
            <label
              className={`mt-3 flex items-center justify-between text-sm text-gray-600 transition-opacity ${
                effectiveRecurrence !== "once" ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
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
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-4">
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
    </dialog>
  );
}
