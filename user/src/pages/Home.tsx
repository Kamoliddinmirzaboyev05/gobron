import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useFields } from "../hooks/useFields";
import { useBanners } from "../hooks/useBanners";
import { primaryFieldPerOwner } from "../lib/fields";
import FieldCard from "../components/FieldCard";
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
    <div className="pb-20">
      {/* Hero */}
      {banners && banners.length > 0 ? (
        <section className="h-52 overflow-hidden rounded-b-3xl">
          <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            loop={banners.length > 1}
            className="hero-swiper h-full"
          >
            {banners.map((b) => (
              <SwiperSlide key={b.id}>
                {b.link ? (
                  <a href={b.link} target="_blank" rel="noreferrer" className="block h-full">
                    <img src={b.image_url} alt="" className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <img src={b.image_url} alt="" className="h-full w-full object-cover" />
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-pitch-700 via-pitch-600 to-emerald-500 px-5 pb-14 pt-14 text-white">
          <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-12 h-60 w-60 rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_60%)]" />
          <div className="relative z-10">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/15 px-3 py-1 text-xs font-medium tracking-wide backdrop-blur-md">
              Yangi avlod bron tizimi 🚀
            </span>
            <h1 className="mt-3 text-[2rem] font-extrabold leading-[1.15] tracking-tight">
              Eng yaxshi maydonlar
              <br />
              <span className="text-emerald-100">sizning qo'lingizda</span>
            </h1>
            <p className="mt-3 max-w-[280px] text-sm font-medium text-emerald-50/90">
              O'zingizga yaqin va qulay maydonlarni toping va tezkor so'rov yuboring.
            </p>
          </div>
        </section>
      )}

      {/* Search — floats over the hero's bottom edge */}
      <section className="relative z-20 -mt-7 px-5">
        <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-gray-100 transform transition-all focus-within:scale-[1.02]">
          <Search className="ml-3 h-5 w-5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Maydon nomi yoki manzil..."
            className="flex-1 bg-transparent py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 font-medium"
          />
          <button className="rounded-lg bg-gradient-to-r from-pitch-600 to-pitch-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-pitch-500 hover:to-pitch-400 transition-all active:scale-95">
            Qidirish
          </button>
        </form>
      </section>

      {/* Popular fields */}
      <section className="px-5 pb-8 pt-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Tavsiya etiladi</h2>
            <p className="text-sm text-gray-500 font-medium">Siz uchun tanlangan maydonlar</p>
          </div>
          <button onClick={() => navigate('/fields')} className="text-sm font-semibold text-pitch-600 active:text-pitch-700">
            Barchasi
          </button>
        </div>
        
        {isLoading ? (
          <FieldListSkeleton count={3} />
        ) : error ? (
          <ErrorBox message="Maydonlarni yuklab bo'lmadi." />
        ) : (
          <div className="grid gap-5">
            {uniqueFields.slice(0, 6).map((f) => (
              <FieldCard key={f.id} field={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
