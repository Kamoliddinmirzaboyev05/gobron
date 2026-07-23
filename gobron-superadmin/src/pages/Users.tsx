import { useState } from "react";
import { Search, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { useUsers, useUserActions, type UserFilters } from "../hooks/useUsers";
import { useMe } from "../hooks/useAuth";
import { Badge, Empty, Spinner } from "../components/ui";
import { apiErrorMessage } from "../lib/api";
import type { Role } from "../types";

const ROLE_LABEL: Record<Role, string> = {
  player: "O'yinchi",
  field_owner: "Egasi",
  superadmin: "Admin",
};

export default function Users() {
  const [filters, setFilters] = useState<UserFilters>({});
  const [search, setSearch] = useState("");
  const { data: me } = useMe();
  const { data, isLoading, isError, error, refetch } = useUsers({
    ...filters,
    search: search.trim() || undefined,
  });
  const { block, unblock, setRole, remove } = useUserActions();

  const actionError =
    block.error || unblock.error || setRole.error || remove.error;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
          <p className="mt-1 text-sm text-gray-400">
            Rollar, bloklash va o'chirish
          </p>
        </div>
        {data && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200">
            {data.length} ta
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-gray-200">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism yoki telefon"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          className="rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-gray-200"
          value={filters.role ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              role: (e.target.value || undefined) as Role | undefined,
            }))
          }
        >
          <option value="">Barcha rollar</option>
          <option value="player">O'yinchilar</option>
          <option value="field_owner">Egalari</option>
          <option value="superadmin">Adminlar</option>
        </select>
        <select
          className="rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-gray-200"
          value={filters.blocked === undefined ? "" : String(filters.blocked)}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              blocked:
                e.target.value === ""
                  ? undefined
                  : e.target.value === "true",
            }))
          }
        >
          <option value="">Barchasi</option>
          <option value="false">Faol</option>
          <option value="true">Bloklangan</option>
        </select>
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
          {apiErrorMessage(actionError)}
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">{apiErrorMessage(error)}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 text-sm font-medium text-pitch-600"
          >
            Qayta urinish
          </button>
        </div>
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
              {data.map((u) => {
                const isSelf = me?.id === u.id;
                const isProtected = u.role === "superadmin";
                return (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {u.full_name || "—"}
                      {isSelf && (
                        <span className="ml-2 rounded bg-pitch-50 px-1.5 py-0.5 text-[10px] font-semibold text-pitch-700">
                          Siz
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {[u.region, u.city].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) =>
                          setRole.mutate({
                            id: u.id,
                            role: e.target.value as Role,
                          })
                        }
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        value={u.is_blocked ? "cancelled" : "confirmed"}
                        label={u.is_blocked ? "Bloklangan" : "Faol"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {!isSelf && !isProtected && (
                          <>
                            {u.is_blocked ? (
                              <button
                                type="button"
                                title="Blokdan chiqarish"
                                onClick={() => unblock.mutate(u.id)}
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-pitch-600"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Bloklash"
                                onClick={() => block.mutate(u.id)}
                                className="rounded-lg p-2 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              title="O'chirish"
                              onClick={() =>
                                confirm(
                                  `${u.full_name || u.phone || u.id} o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.`,
                                ) && remove.mutate(u.id)
                              }
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
