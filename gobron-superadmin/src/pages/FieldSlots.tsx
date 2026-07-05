import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Plus } from "lucide-react";
import { useFields, useGenerateSlots } from "../hooks/useFields";
import { useFieldSlots, useAddManualSlot, useToggleSlotBlock } from "../hooks/useSlots";
import { Empty, Modal, Spinner } from "../components/ui";
import { shortTime } from "../lib/format";
import type { Slot } from "../types";

function ManualSlotModal({ fieldId, onClose }: { fieldId: number; onClose: () => void }) {
  const add = useAddManualSlot(fieldId);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:00");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    add.mutate(
      { slot_date: date, start_time: `${start}:00`, end_time: `${end}:00` },
      { onSuccess: onClose },
    );
  }

  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm";
  return (
    <Modal title="Qo'lda slot qo'shish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input type="date" required className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input type="time" className={input} value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="time" className={input} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        {add.isError && <p className="text-xs text-red-600">Qo'shishda xatolik.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500">
            Bekor
          </button>
          <button disabled={add.isPending} className="rounded-lg bg-pitch-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {add.isPending ? "..." : "Qo'shish"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function FieldSlots() {
  const { id } = useParams();
  const fieldId = Number(id);
  const navigate = useNavigate();

  const { data: fields } = useFields();
  const field = fields?.find((f) => f.id === fieldId);
  const { data: slots, isLoading } = useFieldSlots(fieldId);
  const generate = useGenerateSlots();
  const toggleBlock = useToggleSlotBlock(fieldId);
  const [showAdd, setShowAdd] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots ?? []) {
      const arr = map.get(slot.slot_date) ?? [];
      arr.push(slot);
      map.set(slot.slot_date, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/fields")} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">{field ? `${field.name} — slotlar` : "Slotlar"}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generate.mutate({ fieldId, days: 14 })}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            <CalendarPlus className="h-4 w-4" /> Avtomatik yaratish
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg bg-pitch-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Qo'lda qo'shish
          </button>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : grouped.length === 0 ? (
        <Empty>Hali slot yo'q. Yuqoridagi tugmalardan birini bosing.</Empty>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, daySlots]) => (
            <div key={date} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <div className="mb-3 text-sm font-medium text-gray-700">{date}</div>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => {
                  const booked = slot.status === "booked";
                  const blocked = slot.status === "blocked";
                  return (
                    <button
                      key={slot.id}
                      disabled={booked}
                      onClick={() => toggleBlock.mutate(slot)}
                      className={`rounded-lg border px-3 py-1.5 text-xs ${
                        booked
                          ? "border-gray-200 bg-gray-100 text-gray-400"
                          : blocked
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-pitch-200 bg-pitch-50 text-pitch-700"
                      }`}
                    >
                      {shortTime(slot.start_time)}
                      {blocked ? " · bloklangan" : booked ? " · band" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <ManualSlotModal fieldId={fieldId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
