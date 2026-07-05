import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import type { Field } from "../types";
import { formatPrice } from "../lib/format";

export default function FieldCard({ field }: { field: Field }) {
  const cover = field.images[0];
  return (
    <Link
      to={`/fields/${field.id}`}
      className="block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
    >
      <div className="relative h-40 bg-pitch-100">
        {cover ? (
          <img src={cover} alt={field.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">⚽</div>
        )}
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          {field.rating.toFixed(1)}
        </span>
      </div>
      <div className="p-3">
        <h3 className="truncate font-semibold">{field.name}</h3>
        {field.address && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            {field.address}
          </p>
        )}
        <p className="mt-2 text-sm font-semibold text-pitch-600">
          {formatPrice(field.price_per_slot)}
          <span className="font-normal text-gray-400"> / {field.slot_duration} daq</span>
        </p>
      </div>
    </Link>
  );
}
