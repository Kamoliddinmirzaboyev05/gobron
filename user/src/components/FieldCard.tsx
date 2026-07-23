import { Link } from "react-router-dom";
import { MapPin, Star, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import type { Field } from "../types";
import { formatPrice, slotUnit } from "../lib/format";

export default function FieldCard({ field }: { field: Field }) {
  const images = field.images ?? [];

  return (
    <Link
      to={`/fields/${field.id}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition active:scale-[0.985]"
    >
      <div className="relative h-44 overflow-hidden bg-pitch-50">
        {images.length > 1 ? (
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            className="field-card-swiper h-full w-full"
          >
            {images.map((src, i) => (
              <SwiperSlide key={i}>
                <img
                  src={src}
                  alt={field.name}
                  className="h-full w-full object-cover"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : images[0] ? (
          <img
            src={images[0]}
            alt={field.name}
            className="h-full w-full object-cover transition duration-500 group-active:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-pitch-100 to-emerald-50 text-5xl">
            ⚽
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        <span className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-gray-900 shadow-sm backdrop-blur">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {field.rating.toFixed(1)}
        </span>

        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 text-white">
          <h3 className="truncate text-lg font-bold drop-shadow-sm">{field.name}</h3>
          {field.address && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-white/85">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {field.address}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 p-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Narx
          </p>
          <p className="text-base font-bold text-pitch-700">
            {formatPrice(field.price_per_slot)}
            <span className="ml-1 text-xs font-medium text-gray-400">
              / {slotUnit(field.slot_duration)}
            </span>
          </p>
        </div>
        <span className="inline-flex items-center gap-0.5 rounded-xl bg-pitch-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm">
          Bron
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
