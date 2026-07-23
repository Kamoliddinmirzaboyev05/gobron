import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarPlus,
  CalendarClock,
  Clock,
  MapPin,
  Star,
  ImageOff,
  Search,
} from "lucide-react";
import { useFields, useDeleteField, useGenerateSlots } from "../hooks/useFields";
import FieldFormModal from "../components/FieldFormModal";
import { Empty, Spinner } from "../components/ui";
import { formatPrice, shortTime } from "../lib/format";
import type { Field } from "../types";

const SURFACE_LABEL: Record<string, string> = {
  open: "Ochiq",
  indoor: "Yopiq",
  covered: "Yopiq",
  outdoor: "Ochiq",
};

function FieldCard({
  field,
  onEdit,
  onDelete,
  onGenerate,
  generating,
}: {
  field: Field;
  onEdit: () => void;
  onDelete: () => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const cover = field.images?.[0];
  const [imgError, setImgError] = useState(false);
  const showImg = cover && !imgError;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Cover */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-pitch-50 to-emerald-100">
        {showImg ? (
          <img
            src={cover}
            alt={field.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-pitch-600/40">
            <ImageOff className="h-10 w-10" />
            <span className="text-xs font-medium">Rasm yo'q</span>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${
              field.is_active
                ? "bg-emerald-500/95 text-white"
                : "bg-gray-800/70 text-white"
            }`}
          >
            {field.is_active ? "Faol" : "Nofaol"}
          </span>
          {field.rating > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {field.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Image count */}
        {field.images.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            +{field.images.length - 1} rasm
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3">
          <h3 className="truncate text-base font-bold text-gray-900">{field.name}</h3>
          {field.address ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="line-clamp-2">{field.address}</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">Manzil ko'rsatilmagan</p>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Ish vaqti
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-gray-800">
              <Clock className="h-3.5 w-3.5 text-pitch-600" />
              {shortTime(field.opening_time)}–{shortTime(field.closing_time)}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Slot
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-800">
              {field.slot_duration} daqiqa
            </p>
          </div>
          <div className="rounded-xl bg-pitch-50 px-3 py-2 col-span-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-pitch-600/70">
              Narx / slot
            </p>
            <p className="mt-0.5 text-base font-bold text-pitch-700">
              {formatPrice(field.price_per_slot)}
            </p>
          </div>
        </div>

        {/* Meta chips */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {field.surface_type && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              {SURFACE_LABEL[field.surface_type] ?? field.surface_type}
            </span>
          )}
          {field.size && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              {field.size}
            </span>
          )}
          {(field.amenities ?? []).slice(0, 3).map((a) => (
            <span
              key={a}
              className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
            >
              {a}
            </span>
          ))}
          {(field.amenities ?? []).length > 3 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
              +{field.amenities!.length - 3}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-1 border-t border-gray-100 pt-3">
          <button
            type="button"
            title="Slot generatsiya (14 kun)"
            disabled={generating}
            onClick={onGenerate}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-pitch-50 hover:text-pitch-600 disabled:opacity-50"
          >
            <CalendarPlus className="h-4 w-4" />
          </button>
          <Link
            to={`/fields/${field.id}/slots`}
            title="Slotlarni boshqarish"
            className="rounded-xl p-2 text-gray-400 transition hover:bg-pitch-50 hover:text-pitch-600"
          >
            <CalendarClock className="h-4 w-4" />
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
          <Link
            to={`/fields/${field.id}/slots`}
            className="ml-auto rounded-xl bg-pitch-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-pitch-700"
          >
            Slotlar
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Fields() {
  const { data, isLoading } = useFields();
  const del = useDeleteField();
  const gen = useGenerateSlots();
  const [editing, setEditing] = useState<Field | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  function openNew() {
    setEditing(null);
    setShowModal(true);
  }
  function openEdit(f: Field) {
    setEditing(f);
    setShowModal(true);
  }

  const filtered = (data ?? []).filter((f) => {
    if (filter === "active" && !f.is_active) return false;
    if (filter === "inactive" && f.is_active) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.address ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Maydonlar</h1>
          <p className="mt-1 text-sm text-gray-400">
            {data ? `${data.length} ta maydon` : "Yuklanmoqda…"}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-pitch-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pitch-700"
        >
          <Plus className="h-4 w-4" /> Yangi maydon
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-gray-200">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish: nom yoki manzil"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {(
          [
            ["all", "Barchasi"],
            ["active", "Faol"],
            ["inactive", "Nofaol"],
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
      ) : filtered.length === 0 ? (
        <Empty>
          {data && data.length > 0
            ? "Qidiruv bo'yicha maydon topilmadi"
            : "Hali maydon qo'shilmagan"}
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => (
            <FieldCard
              key={f.id}
              field={f}
              generating={gen.isPending}
              onEdit={() => openEdit(f)}
              onGenerate={() => gen.mutate({ fieldId: f.id, days: 14 })}
              onDelete={() =>
                confirm(`"${f.name}" o'chirilsinmi?`) && del.mutate(f.id)
              }
            />
          ))}
        </div>
      )}

      {gen.isSuccess && (
        <p className="mt-4 text-sm font-medium text-pitch-600">
          Slotlar generatsiya qilindi ✅
        </p>
      )}
      {showModal && (
        <FieldFormModal field={editing} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
