import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Navigation, Phone, Star } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useField, useFields } from "../hooks/useFields";
import { formatPrice, shortTime, slotUnit } from "../lib/format";
import { amenityLabel } from "../lib/amenities";
import { FieldDetailSkeleton } from "../components/Skeleton";
import { ErrorBox } from "../components/ui";
import BookingModal from "../components/BookingModal";

export default function FieldDetail() {
  const { id } = useParams();
  const fieldId = Number(id);
  const navigate = useNavigate();

  const { data: field, isLoading, error } = useField(fieldId);
  const { data: allFields } = useFields();
  const [showModal, setShowModal] = useState(false);

  const siblingFields = useMemo(() => {
    if (!field || !allFields) return [];
    // Oldest first, so the owner's original pitch leads.
    return allFields
      .filter((f) => f.owner_id === field.owner_id)
      .sort((a, b) => a.id - b.id);
  }, [field, allFields]);

  if (isLoading) return <FieldDetailSkeleton />;
  if (error || !field) return <ErrorBox message="Maydon topilmadi." />;

  return (
    <div className="pb-28">
      {/* Gallery */}
      <div className="relative h-56 bg-pitch-100">
        {field.images.length > 1 ? (
          <Swiper modules={[Pagination]} pagination={{ clickable: true }} className="h-full w-full field-card-swiper">
            {field.images.map((src, i) => (
              <SwiperSlide key={i}>
                <img src={src} alt={field.name} className="h-full w-full object-cover" />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : field.images[0] ? (
          <img src={field.images[0]} alt={field.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">⚽</div>
        )}
        <Link
          to="/fields"
          className="absolute left-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {/* Sibling pitches: the whole point of this venue having more than one,
          so it leads the page rather than hiding at the bottom. Scrolls, so
          three or ten pitches all work. */}
      {siblingFields.length > 1 && (
        <div className="border-b border-gray-100 bg-white px-4 py-4">
          <h2 className="mb-3 text-base font-bold text-gray-900">
            Bu joyda {siblingFields.length} ta maydon
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            {siblingFields.map((sf) => {
              const active = sf.id === field.id;
              return (
                <button
                  key={sf.id}
                  onClick={() => navigate(`/fields/${sf.id}`, { replace: true })}
                  className={`w-36 shrink-0 overflow-hidden rounded-xl text-left transition-all ${
                    active
                      ? "ring-2 ring-pitch-600"
                      : "opacity-80 ring-1 ring-gray-200 active:opacity-100"
                  }`}
                >
                  <div className="relative h-20 bg-pitch-50">
                    {sf.images[0] ? (
                      <img src={sf.images[0]} alt={sf.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">⚽</div>
                    )}
                    {active && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-pitch-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        Tanlangan
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-sm font-bold text-gray-900">{sf.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-pitch-600">
                      {formatPrice(sf.price_per_slot)}
                      <span className="font-normal text-gray-400">/{slotUnit(sf.slot_duration)}</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{field.name}</h1>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {field.rating.toFixed(1)}
          </span>
        </div>
        {field.address && (
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" /> {field.address}
          </p>
        )}
        {field.phone && (
          <a
            href={`tel:${field.phone}`}
            className="mt-1 flex items-center gap-1 text-sm font-medium text-pitch-600"
          >
            <Phone className="h-4 w-4" /> {field.phone}
          </a>
        )}
        {field.description && (
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{field.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {shortTime(field.opening_time)}–{shortTime(field.closing_time)}
          </span>
          <span>{field.surface_type === "covered" ? "Yopiq maydon" : "Ochiq maydon"}</span>
          {field.size && <span>{field.size} m</span>}
        </div>

        {field.latitude != null && field.longitude != null && (
          <a
            href={`https://maps.google.com/?q=${field.latitude},${field.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-pitch-600 py-2.5 text-sm font-medium text-pitch-600"
          >
            <Navigation className="h-4 w-4" /> Xaritada ochish
          </a>
        )}

        {field.amenities.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Qulayliklar</h2>
            <div className="flex flex-wrap gap-2">
              {field.amenities.map((key) => (
                <span
                  key={key}
                  className="rounded-full bg-pitch-50 px-3 py-1.5 text-xs font-medium text-pitch-700"
                >
                  {amenityLabel(key)}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Sticky booking bar */}
      <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-md border-t border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Narxi</p>
            <p className="text-lg font-bold text-pitch-600">
              {formatPrice(field.price_per_slot)}
              <span className="ml-1 text-sm font-normal text-gray-400">/ {slotUnit(field.slot_duration)}</span>
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-pitch-600 px-6 py-3 font-semibold text-white"
          >
            Band qilish
          </button>
        </div>
      </div>

      {showModal && (
        <BookingModal
          fields={siblingFields.length > 1 ? siblingFields : [field]}
          initialFieldId={field.id}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
