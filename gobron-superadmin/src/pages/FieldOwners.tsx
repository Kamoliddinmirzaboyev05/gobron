import { useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { useFieldOwners, useDeleteFieldOwner, useVerifyFieldOwner } from "../hooks/useFieldOwners";
import FieldOwnerFormModal from "../components/FieldOwnerFormModal";
import { Badge, Empty, Spinner } from "../components/ui";
import type { FieldOwner } from "../types";

export default function FieldOwners() {
  const { data, isLoading } = useFieldOwners();
  const del = useDeleteFieldOwner();
  const verify = useVerifyFieldOwner();
  const [editing, setEditing] = useState<FieldOwner | null>(null);
  const [showModal, setShowModal] = useState(false);

  function openNew() {
    setEditing(null);
    setShowModal(true);
  }
  function openEdit(o: FieldOwner) {
    setEditing(o);
    setShowModal(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Maydon egalari</h1>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-pitch-600 px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Yangi
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <Empty>Maydon egasi yo'q</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-left text-xs text-gray-400">
              <tr>
                <th className="px-4 py-3">Biznes nomi</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Tasdiqlangan</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium">{o.business_name}</td>
                  <td className="px-4 py-3 text-gray-500">{o.contact_phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge value={o.is_verified ? "confirmed" : "pending"} label={o.is_verified ? "Ha" : "Yo'q"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {!o.is_verified && (
                        <button
                          title="Tasdiqlash"
                          onClick={() => verify.mutate(o.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-pitch-600"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                      )}
                      <button title="Tahrirlash" onClick={() => openEdit(o)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title="O'chirish"
                        onClick={() => confirm(`"${o.business_name}" o'chirilsinmi?`) && del.mutate(o.id)}
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

      {showModal && <FieldOwnerFormModal owner={editing} onClose={() => setShowModal(false)} />}
    </div>
  );
}
