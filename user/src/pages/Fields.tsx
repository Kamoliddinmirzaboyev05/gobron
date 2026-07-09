import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { useFields, type FieldFilters, type FieldSort } from "../hooks/useFields";
import FieldCard from "../components/FieldCard";
import { primaryFieldPerOwner } from "../lib/fields";
import { FieldListSkeleton } from "../components/Skeleton";
import { Empty, ErrorBox } from "../components/ui";

const SORTS: { value: FieldSort; label: string }[] = [
  { value: "rating", label: "Tavsiya etiladi" },
  { value: "cheapest", label: "Eng arzon" },
  { value: "popular", label: "Eng ommabop" },
];

export default function Fields() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  const [availableToday, setAvailableToday] = useState(false);
  const [sort, setSort] = useState<FieldSort>("rating");
  const [showFilters, setShowFilters] = useState(false);

  const filters: FieldFilters = {
    search: search.trim() || undefined,
    min_price: minPrice ? Number(minPrice) : undefined,
    max_price: maxPrice ? Number(maxPrice) : undefined,
    min_rating: minRating ? Number(minRating) : undefined,
    available_today: availableToday || undefined,
    sort,
  };
  const { data, isLoading, error } = useFields(filters);

  const uniqueFields = primaryFieldPerOwner(data);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="rounded-lg bg-white p-2.5 ring-1 ring-gray-200"
        >
          <SlidersHorizontal className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSort(s.value)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              sort === s.value ? "bg-pitch-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={() => setAvailableToday((v) => !v)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            availableToday ? "bg-pitch-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
          }`}
        >
          Bo'sh
        </button>
      </div>

      {showFilters && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-white p-3 ring-1 ring-gray-200">
          <label className="text-xs text-gray-500">
            Min. narx
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="so'm"
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
            />
          </label>
          <label className="text-xs text-gray-500">
            Maks. narx
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="so'm"
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
            />
          </label>
          <label className="col-span-2 text-xs text-gray-500">
            Min. reyting
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
            >
              <option value="">Barchasi</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
            </select>
          </label>
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <FieldListSkeleton count={4} />
        ) : error ? (
          <ErrorBox message="Maydonlarni yuklab bo'lmadi." />
        ) : uniqueFields.length > 0 ? (
          <div className="grid gap-4">
            {uniqueFields.map((f) => (
              <FieldCard key={f.id} field={f} />
            ))}
          </div>
        ) : (
          <Empty>Maydon topilmadi</Empty>
        )}
      </div>
    </div>
  );
}
