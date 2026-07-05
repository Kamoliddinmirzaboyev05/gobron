import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, CalendarPlus, CalendarClock } from "lucide-react";
import { useFields, useDeleteField, useGenerateSlots } from "../hooks/useFields";
import FieldFormModal from "../components/FieldFormModal";
import { Badge, Empty, Spinner } from "../components/ui";
import { formatPrice } from "../lib/format";
import type { Field } from "../types";

export default function Fields() {
  const { data, isLoading } = useFields();
  const del = useDeleteField();
  const gen = useGenerateSlots();
  const [editing, setEditing] = useState<Field | null>(null);
  const [showModal, setShowModal] = useState(false);

  function openNew() {
    setEditing(null);
    setShowModal(true);
  }
  function openEdit(f: Field) {
    setEditing(f);
    setShowModal(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Maydonlar</h1>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-pitch-600 px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Yangi
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <Empty>Maydon yo'q</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-left text-xs text-gray-400">
              <tr>
                <th className="px-4 py-3">Nomi</th>
                <th className="px-4 py-3">Ish vaqti</th>
                <th className="px-4 py-3">Slot</th>
                <th className="px-4 py-3">Narx</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {data.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-gray-500">{f.opening_time.slice(0, 5)}–{f.closing_time.slice(0, 5)}</td>
                  <td className="px-4 py-3 text-gray-500">{f.slot_duration} daq</td>
                  <td className="px-4 py-3">{formatPrice(f.price_per_slot)}</td>
                  <td className="px-4 py-3">
                    <Badge value={f.is_active ? "confirmed" : "cancelled"} label={f.is_active ? "Faol" : "Nofaol"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        title="Slot generatsiya (14 kun)"
                        onClick={() => gen.mutate({ fieldId: f.id, days: 14 })}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-pitch-600"
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </button>
                      <Link
                        to={`/fields/${f.id}/slots`}
                        title="Slotlarni boshqarish"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-pitch-600"
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Link>
                      <button title="Tahrirlash" onClick={() => openEdit(f)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title="O'chirish"
                        onClick={() => confirm(`"${f.name}" o'chirilsinmi?`) && del.mutate(f.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {gen.isSuccess && <p className="mt-3 text-sm text-pitch-600">Slotlar generatsiya qilindi ✅</p>}
      {showModal && <FieldFormModal field={editing} onClose={() => setShowModal(false)} />}
    </div>
  );
}
