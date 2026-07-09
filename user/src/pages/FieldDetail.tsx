import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useField, useFields } from "../hooks/useFields";
import { formatPrice } from "../lib/format";
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
        {field.description && (
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{field.description}</p>
        )}

        {siblingFields.length > 1 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Bu yerda {siblingFields.length} ta maydon bor
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {siblingFields.map((sf) => (
                <button
                  key={sf.id}
                  onClick={() => navigate(`/fields/${sf.id}`, { replace: true })}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                    sf.id === field.id
                      ? "bg-pitch-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {sf.name}
                </button>
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
              <span className="ml-1 text-sm font-normal text-gray-400">/ {field.slot_duration} daq</span>
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
