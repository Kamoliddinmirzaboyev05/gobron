/**
 * Home hero carousel — admin banners via Swiper, or branded fallback slides.
 */
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import type { Banner } from "../types";

const FALLBACK = [
  {
    id: "f1",
    gradient: "from-pitch-700 via-pitch-600 to-emerald-500",
    badge: "Yangi avlod bron tizimi 🚀",
    title: "Eng yaxshi maydonlar",
    highlight: "sizning qo'lingizda",
    subtitle: "Yaqin atrofdagi maydonlarni toping va tezkor so'rov yuboring.",
  },
  {
    id: "f2",
    gradient: "from-emerald-700 via-teal-600 to-cyan-500",
    badge: "24/7 bron ⚽",
    title: "Qulay vaqtni",
    highlight: "bir zumda band qiling",
    subtitle: "Real-time slotlar, tezkor tasdiq, shaffof narxlar.",
  },
  {
    id: "f3",
    gradient: "from-slate-800 via-pitch-700 to-pitch-500",
    badge: "Gobron ✨",
    title: "O'yinni rejalashtiring,",
    highlight: "biz qulaylik beramiz",
    subtitle: "Do'stlaringiz bilan maydon band qiling — hammasi Telegramda.",
  },
];

export default function HeroSlider({ banners }: { banners?: Banner[] }) {
  const hasBanners = !!banners && banners.length > 0;

  return (
    <section className="relative h-[280px] overflow-hidden sm:h-[300px]">
      {hasBanners ? (
        <Swiper
          modules={[Autoplay, Pagination, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          pagination={{ clickable: true, dynamicBullets: true }}
          loop={banners.length > 1}
          className="hero-swiper h-full w-full"
        >
          {banners.map((b) => (
            <SwiperSlide key={b.id}>
              <div className="relative h-full w-full">
                {b.link ? (
                  <a href={b.link} target="_blank" rel="noreferrer" className="block h-full w-full">
                    <img
                      src={b.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </a>
                ) : (
                  <img
                    src={b.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
                {/* Soft bottom fade for search overlap */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20" />
                <div className="pointer-events-none absolute bottom-14 left-5 right-5">
                  <span className="inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    Gobron poster
                  </span>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <Swiper
          modules={[Autoplay, Pagination, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          loop
          className="hero-swiper h-full w-full"
        >
          {FALLBACK.map((s) => (
            <SwiperSlide key={s.id}>
              <div
                className={`relative flex h-full flex-col justify-end bg-gradient-to-br ${s.gradient} px-5 pb-16 pt-12 text-white`}
              >
                <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_55%)]" />
                <div className="relative z-10">
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-md">
                    {s.badge}
                  </span>
                  <h1 className="mt-3 text-[1.85rem] font-extrabold leading-[1.12] tracking-tight">
                    {s.title}
                    <br />
                    <span className="text-emerald-100/95">{s.highlight}</span>
                  </h1>
                  <p className="mt-2.5 max-w-[280px] text-[13px] font-medium leading-snug text-white/85">
                    {s.subtitle}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {/* Bottom curve into page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 rounded-t-[1.75rem] bg-gray-50" />
    </section>
  );
}
