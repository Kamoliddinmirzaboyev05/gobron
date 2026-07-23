import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, TrendingUp, MapPinned } from "lucide-react";
import { useFields } from "../hooks/useFields";
import { useBanners } from "../hooks/useBanners";
import { primaryFieldPerOwner } from "../lib/fields";
import FieldCard from "../components/FieldCard";
import HeroSlider from "../components/HeroSlider";
import { FieldListSkeleton } from "../components/Skeleton";
import { ErrorBox } from "../components/ui";

export default function Home() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: fields, isLoading, error } = useFields();
  const { data: banners } = useBanners();

  const uniqueFields = primaryFieldPerOwner(fields);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(q.trim() ? `/fields?search=${encodeURIComponent(q.trim())}` : "/fields");
  }

  return (
    <div className="pb-24">
      <HeroSlider banners={banners} />

      {/* Floating search */}
      <section className="relative z-20 -mt-2 px-4">
        <form
          onSubmit={submitSearch}
          className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-black/5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pitch-50 text-pitch-600">
            <Search className="h-4 w-4" />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Maydon nomi yoki manzil…"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-pitch-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-95"
          >
            Qidirish
          </button>
        </form>
      </section>

      {/* Quick chips */}
      <section className="mt-5 flex gap-2 overflow-x-auto px-4 hide-scrollbar">
        {[
          { label: "Bugun bo'sh", icon: Sparkles, to: "/fields?available=1" },
          { label: "Eng arzon", icon: TrendingUp, to: "/fields" },
          { label: "Yaqin atrof", icon: MapPinned, to: "/fields" },
        ].map(({ label, icon: Icon, to }) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(to)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-100 transition active:scale-95"
          >
            <Icon className="h-3.5 w-3.5 text-pitch-600" />
            {label}
          </button>
        ))}
      </section>

      {/* Recommended */}
      <section className="px-4 pb-8 pt-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">
              Tavsiya etiladi
            </h2>
            <p className="text-sm font-medium text-gray-500">
              Siz uchun tanlangan maydonlar
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/fields")}
            className="text-sm font-semibold text-pitch-600 active:text-pitch-700"
          >
            Barchasi
          </button>
        </div>

        {isLoading ? (
          <FieldListSkeleton count={3} />
        ) : error ? (
          <ErrorBox message="Maydonlarni yuklab bo'lmadi." />
        ) : uniqueFields.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-3xl">⚽</p>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Hozircha maydon yo'q
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {uniqueFields.slice(0, 6).map((f) => (
              <FieldCard key={f.id} field={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
