import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Check } from "lucide-react";
import { useField } from "../hooks/useFields";
import { useSlots } from "../hooks/useSlots";
import { useCreateBooking } from "../hooks/useBookings";
import { formatPrice, nextDays, shortTime } from "../lib/format";
import { Empty, ErrorBox, Spinner } from "../components/ui";
import type { RecurrenceType, Slot } from "../types";

const RECURRENCE: { value: RecurrenceType; label: string }[] = [
  { value: "once", label: "Bir marta" },
  { value: "daily", label: "Har kuni" },
  { value: "weekly", label: "Har hafta" },
];

export default function FieldDetail() {
  const { id } = useParams();
  const fieldId = Number(id);
  const { data: field, isLoading, error } = useField(fieldId);

  const days = useMemo(() => nextDays(14), []);
  const [date, setDate] = useState(days[0].iso);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [occurrences, setOccurrences] = useState(4);

  const { data: slots, isLoading: slotsLoading } = useSlots(fieldId, date);
  const createBooking = useCreateBooking();

  if (isLoading) return <Spinner />;
  if (error || !field) return <ErrorBox message="Maydon topilmadi." />;

  const total =
    selected && recurrence !== "once"
      ? selected.price * occurrences
      : selected?.price ?? 0;

  async function confirm() {
    if (!selected) return;
    await createBooking.mutateAsync({
      slot_id: selected.id,
      recurrence_type: recurrence,
      occurrences: recurrence === "once" ? 1 : occurrences,
    });
    setSelected(null);
  }

  return (
    <div className="pb-28">
      {/* Gallery */}
      <div className="relative h-56 bg-pitch-100">
        {field.images[0] ? (
          <img src={field.images[0]} alt={field.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">⚽</div>
        )}
        <Link
          to="/fields"
          className="absolute left-3 top-3 rounded-full bg-black/50 p-2 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{field.name}</h1>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {field.rating.toFixed(1)}
          </span>
        </div>
        {field.address && (
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" /> {field.address}
          </p>
        )}
        {field.description && (
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{field.description}</p>
        )}

        {/* Day picker */}
        <h2 className="mt-6 mb-2 font-semibold">Sana tanlang</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button
              key={d.iso}
              onClick={() => {
                setDate(d.iso);
                setSelected(null);
              }}
              className={`flex min-w-14 shrink-0 flex-col items-center rounded-xl px-3 py-2 text-sm ${
                d.iso === date
                  ? "bg-pitch-600 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200"
              }`}
            >
              <span className="text-xs opacity-80">{d.weekday}</span>
              <span className="font-semibold">{d.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* Slots */}
        <h2 className="mt-6 mb-2 font-semibold">Bo'sh vaqtlar</h2>
        {slotsLoading ? (
          <Spinner />
        ) : slots && slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`rounded-xl py-2.5 text-sm font-medium ring-1 ${
                  selected?.id === s.id
                    ? "bg-pitch-600 text-white ring-pitch-600"
                    : "bg-white text-gray-700 ring-gray-200"
                }`}
              >
                {shortTime(s.start_time)}
              </button>
            ))}
          </div>
        ) : (
          <Empty>Bu kunda bo'sh vaqt yo'q</Empty>
        )}

        {/* Recurrence (only when a slot is chosen) */}
        {selected && (
          <>
            <h2 className="mt-6 mb-2 font-semibold">Takrorlanish</h2>
            <div className="flex gap-2">
              {RECURRENCE.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRecurrence(r.value)}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium ring-1 ${
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
                  className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-right"
                />
              </label>
            )}
          </>
        )}
      </div>

      {/* Sticky booking bar */}
      {selected && (
        <div className="fixed inset-x-0 bottom-16 mx-auto max-w-md border-t border-gray-200 bg-white p-4">
          {createBooking.isError && (
            <p className="mb-2 text-center text-xs text-red-600">
              Bu vaqt band bo'lib qoldi. Boshqa vaqt tanlang.
            </p>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">
                {shortTime(selected.start_time)}–{shortTime(selected.end_time)}
              </p>
              <p className="text-lg font-bold text-pitch-600">{formatPrice(total)}</p>
            </div>
            <button
              onClick={confirm}
              disabled={createBooking.isPending}
              className="flex items-center gap-2 rounded-xl bg-pitch-600 px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              <Check className="h-5 w-5" />
              {createBooking.isPending ? "..." : "Bron qilish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
