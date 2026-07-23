import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Power,
  List,
  Search,
  MapPin,
  Phone,
  Building2,
  UserRound,
} from "lucide-react";
import {
  useFieldOwners,
  useDeleteFieldOwner,
  useVerifyFieldOwner,
  useToggleFieldOwnerActive,
} from "../hooks/useFieldOwners";
import FieldOwnerFormModal from "../components/FieldOwnerFormModal";
import { Empty, Spinner } from "../components/ui";
import type { FieldOwner } from "../types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function OwnerCard({
  owner,
  onEdit,
  onDelete,
  onVerify,
  onToggle,
  busy,
}: {
  owner: FieldOwner;
  onEdit: () => void;
  onDelete: () => void;
  onVerify: () => void;
  onToggle: () => void;
  busy: boolean;
}) {
  const title = owner.business_name || owner.full_name || `Egasi #${owner.user_id}`;
  const phone = owner.contact_phone || owner.phone;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Header band */}
      <div className="relative bg-gradient-to-br from-pitch-600 via-emerald-600 to-teal-700 px-5 pb-10 pt-5 text-white">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-sm font-bold backdrop-blur-sm ring-1 ring-white/30">
              {initials(title)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold leading-tight">{title}</h3>
              {owner.full_name && owner.full_name !== owner.business_name && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/80">
                  <UserRound className="h-3 w-3" />
                  {owner.full_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                owner.is_verified
                  ? "bg-white text-pitch-700"
                  : "bg-amber-400/90 text-amber-950"
              }`}
            >
              {owner.is_verified ? "Tasdiqlangan" : "Kutilmoqda"}
            </span>
            {owner.is_blocked && (
              <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold">
                Bloklangan
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats pull-up */}
      <div className="-mt-6 grid grid-cols-2 gap-2 px-4">
        <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-gray-100">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Maydonlar
          </p>
          <p className="text-lg font-bold text-gray-900 tabular-nums">
            {owner.fields_count}
            <span className="ml-1 text-xs font-medium text-gray-400">
              / {owner.active_fields_count} faol
            </span>
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-gray-100">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            User ID
          </p>
          <p className="text-lg font-bold text-gray-900 tabular-nums">#{owner.user_id}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <div className="mb-3 space-y-2 text-sm">
          <p className="flex items-center gap-2 text-gray-600">
            <Phone className="h-4 w-4 shrink-0 text-pitch-600" />
            <span className="font-medium">{phone || "Telefon yo'q"}</span>
          </p>
          <p className="flex items-center gap-2 text-gray-500">
            <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate">{owner.business_name}</span>
          </p>
          <p className="text-xs text-gray-400">
            Ro'yxatdan: {new Date(owner.created_at).toLocaleDateString("uz-UZ")}
          </p>
        </div>

        {owner.field_names.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Maydonlari
            </p>
            <div className="flex flex-wrap gap-1.5">
              {owner.field_names.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full bg-pitch-50 px-2.5 py-1 text-[11px] font-medium text-pitch-700"
                >
                  <MapPin className="h-3 w-3" />
                  {name}
                </span>
              ))}
              {owner.fields_count > owner.field_names.length && (
                <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500">
                  +{owner.fields_count - owner.field_names.length}
                </span>
              )}
            </div>
          </div>
        )}

        {owner.fields_count === 0 && (
          <p className="mb-4 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-400">
            Hali maydon bog'lanmagan
          </p>
        )}

        <div className="mt-auto flex items-center gap-1 border-t border-gray-100 pt-3">
          {!owner.is_verified && (
            <button
              type="button"
              title="Tasdiqlash"
              disabled={busy}
              onClick={onVerify}
              className="rounded-xl p-2 text-gray-400 transition hover:bg-pitch-50 hover:text-pitch-600 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            title="Maydonlarni yoqish/o'chirish"
            disabled={busy || owner.fields_count === 0}
            onClick={onToggle}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40"
          >
            <Power className="h-4 w-4" />
          </button>
          <Link
            to={`/fields`}
            title="Maydonlar"
            className="rounded-xl p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
          >
            <List className="h-4 w-4" />
          </Link>
          <button
            type="button"
            title="Tahrirlash"
            onClick={onEdit}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="O'chirish"
            onClick={onDelete}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {!owner.is_verified && (
            <button
              type="button"
              disabled={busy}
              onClick={onVerify}
              className="ml-auto rounded-xl bg-pitch-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pitch-700 disabled:opacity-60"
            >
              Tasdiqlash
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function FieldOwners() {
  const { data, isLoading, isError, error, refetch } = useFieldOwners();
  const del = useDeleteFieldOwner();
  const verify = useVerifyFieldOwner();
  const toggleActive = useToggleFieldOwnerActive();
  const [editing, setEditing] = useState<FieldOwner | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "pending">("all");

  const busy = verify.isPending || toggleActive.isPending || del.isPending;

  const filtered = useMemo(() => {
    return (data ?? []).filter((o) => {
      if (filter === "verified" && !o.is_verified) return false;
      if (filter === "pending" && o.is_verified) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        o.business_name.toLowerCase().includes(q) ||
        (o.full_name ?? "").toLowerCase().includes(q) ||
        (o.phone ?? "").includes(q) ||
        (o.contact_phone ?? "").includes(q) ||
        o.field_names.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [data, filter, search]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Maydon egalari</h1>
          <p className="mt-1 text-sm text-gray-400">
            {data ? `${data.length} ta egasi` : "Yuklanmoqda…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-pitch-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pitch-700"
        >
          <Plus className="h-4 w-4" /> Yangi profil
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-gray-200">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish: ism, telefon, maydon…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {(
          [
            ["all", "Barchasi"],
            ["verified", "Tasdiqlangan"],
            ["pending", "Kutilmoqda"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
              filter === key
                ? "bg-pitch-600 text-white"
                : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-red-600">
            {(error as Error)?.message || "Yuklashda xatolik"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 text-sm font-medium text-pitch-600"
          >
            Qayta urinish
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          {data && data.length > 0
            ? "Qidiruv bo'yicha egasi topilmadi"
            : "Hali maydon egasi yo'q — admin-pwa orqali ro'yxatdan o'tishlari kerak"}
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <OwnerCard
              key={o.id}
              owner={o}
              busy={busy}
              onEdit={() => {
                setEditing(o);
                setShowModal(true);
              }}
              onVerify={() => verify.mutate(o.id)}
              onToggle={() =>
                confirm("Bu egasining barcha maydonlari holati o'zgartirilsinmi?") &&
                toggleActive.mutate(o.id)
              }
              onDelete={() =>
                confirm(`"${o.business_name}" profili o'chirilsinmi?`) && del.mutate(o.id)
              }
            />
          ))}
        </div>
      )}

      {showModal && (
        <FieldOwnerFormModal owner={editing} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
