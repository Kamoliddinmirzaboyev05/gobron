import { useState } from "react";
import { Search, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { useUsers, useUserActions, type UserFilters } from "../hooks/useUsers";
import { Badge, Empty, Spinner } from "../components/ui";
import type { Role } from "../types";

const ROLE_LABEL: Record<Role, string> = {
  player: "O'yinchi",
  field_owner: "Egasi",
  superadmin: "Admin",
};

export default function Users() {
  const [filters, setFilters] = useState<UserFilters>({});
  const [search, setSearch] = useState("");
  const { data, isLoading } = useUsers({ ...filters, search: search.trim() || undefined });
  const { block, unblock, setRole, remove } = useUserActions();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Foydalanuvchilar</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200">
          <Search className="h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism yoki telefon" className="flex-1 text-sm outline-none" />
        </div>
        <select
          className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-gray-200"
          value={filters.role ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, role: (e.target.value || undefined) as Role | undefined }))}
        >
          <option value="">Barcha rollar</option>
          <option value="player">O'yinchilar</option>
          <option value="field_owner">Egalari</option>
          <option value="superadmin">Adminlar</option>
        </select>
        <select
          className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-gray-200"
          value={filters.blocked === undefined ? "" : String(filters.blocked)}
          onChange={(e) => setFilters((f) => ({ ...f, blocked: e.target.value === "" ? undefined : e.target.value === "true" }))}
        >
          <option value="">Barchasi</option>
          <option value="false">Faol</option>
          <option value="true">Bloklangan</option>
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <Empty>Foydalanuvchi topilmadi</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-left text-xs text-gray-400">
              <tr>
                <th className="px-4 py-3">Ism</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Hudud</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{[u.region, u.city].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as Role })}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                    >
                      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={u.is_blocked ? "cancelled" : "confirmed"} label={u.is_blocked ? "Bloklangan" : "Faol"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {u.is_blocked ? (
                        <button title="Blokdan chiqarish" onClick={() => unblock.mutate(u.id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-pitch-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button title="Bloklash" onClick={() => block.mutate(u.id)} className="rounded-lg p-2 text-gray-400 hover:bg-amber-50 hover:text-amber-600">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        title="O'chirish"
                        onClick={() => confirm("O'chirilsinmi?") && remove.mutate(u.id)}
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
    </div>
  );
}
