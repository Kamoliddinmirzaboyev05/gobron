import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import type { Field } from "../types";
import { formatPrice } from "../lib/format";

export default function FieldCard({ field }: { field: Field }) {
  const cover = field.images[0];
  return (
    <Link
      to={`/fields/${field.id}`}
      className="group relative block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]"
    >
      <div className="relative h-44 overflow-hidden bg-pitch-50">
        {cover ? (
          <img 
            src={cover} 
            alt={field.name} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-tr from-pitch-100 to-pitch-50 text-6xl">⚽</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
        
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-gray-900 shadow-sm backdrop-blur-sm">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {field.rating.toFixed(1)}
        </span>
        
        <div className="absolute bottom-3 left-3 pr-3 text-white">
          <h3 className="truncate text-lg font-bold drop-shadow-md">{field.name}</h3>
          {field.address && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-gray-200 drop-shadow">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {field.address}
            </p>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Narxi</p>
            <p className="mt-1 text-lg font-bold text-pitch-600">
              {formatPrice(field.price_per_slot)}
              <span className="ml-1 text-sm font-normal text-gray-400">/ {field.slot_duration} daq</span>
            </p>
          </div>
          <div className="rounded-xl bg-pitch-50 px-4 py-2 text-sm font-semibold text-pitch-600 transition-colors group-hover:bg-pitch-100">
            Bron qilish
          </div>
        </div>
      </div>
    </Link>
  );
}
