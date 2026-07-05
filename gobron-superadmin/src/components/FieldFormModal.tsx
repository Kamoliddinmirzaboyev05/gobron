import { useState } from "react";
import { Modal } from "./ui";
import { useSaveField, type FieldInput } from "../hooks/useFields";
import type { Field } from "../types";

const WEEKDAYS = ["Du", "Se", "Chor", "Pay", "Jum", "Sha", "Yak"]; // 0..6 = Mon..Sun

export default function FieldFormModal({
  field,
  onClose,
}: {
  field: Field | null;
  onClose: () => void;
}) {
  const save = useSaveField();
  const [f, setF] = useState<FieldInput>({
    name: field?.name ?? "",
    address: field?.address ?? "",
    description: field?.description ?? "",
    opening_time: (field?.opening_time ?? "08:00:00").slice(0, 5),
    closing_time: (field?.closing_time ?? "23:00:00").slice(0, 5),
    slot_duration: field?.slot_duration ?? 60,
    working_days: field?.working_days ?? [0, 1, 2, 3, 4, 5, 6],
    price_per_slot: field?.price_per_slot ?? 0,
    peak_start_time: field?.peak_start_time?.slice(0, 5) ?? null,
    peak_price_multiplier: field?.peak_price_multiplier ?? 1,
    images: field?.images ?? [],
    is_active: field?.is_active ?? true,
  });

  const set = <K extends keyof FieldInput>(k: K, v: FieldInput[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  function toggleDay(d: number) {
    const days = f.working_days ?? [];
    set("working_days", days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: field?.id, data: { ...f, peak_start_time: f.peak_start_time || null } },
      { onSuccess: onClose },
    );
  }

  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm";

  return (
    <Modal title={field ? "Maydonni tahrirlash" : "Yangi maydon"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input className={input} placeholder="Nomi" value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} required />
        <input className={input} placeholder="Manzil" value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        <textarea className={input} rows={2} placeholder="Tavsif" value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            Ochilish
            <input type="time" className={`${input} mt-1`} value={f.opening_time ?? ""} onChange={(e) => set("opening_time", e.target.value)} />
          </label>
          <label className="text-xs text-gray-500">
            Yopilish
            <input type="time" className={`${input} mt-1`} value={f.closing_time ?? ""} onChange={(e) => set("closing_time", e.target.value)} />
          </label>
        </div>

        <label className="block text-xs text-gray-500">
          Slot davomiyligi
          <select className={`${input} mt-1`} value={f.slot_duration} onChange={(e) => set("slot_duration", Number(e.target.value))}>
            <option value={30}>30 daqiqa</option>
            <option value={60}>60 daqiqa</option>
          </select>
        </label>

        <div>
          <p className="mb-1 text-xs text-gray-500">Ish kunlari</p>
          <div className="flex gap-1">
            {WEEKDAYS.map((label, d) => (
              <button
                type="button"
                key={d}
                onClick={() => toggleDay(d)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${
                  (f.working_days ?? []).includes(d) ? "bg-pitch-600 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            Narx (so'm)
            <input type="number" className={`${input} mt-1`} value={f.price_per_slot} onChange={(e) => set("price_per_slot", Number(e.target.value))} />
          </label>
          <label className="text-xs text-gray-500">
            Peak boshlanishi
            <input type="time" className={`${input} mt-1`} value={f.peak_start_time ?? ""} onChange={(e) => set("peak_start_time", e.target.value)} />
          </label>
        </div>

        <label className="block text-xs text-gray-500">
          Peak koeffitsienti
          <input type="number" step="0.1" className={`${input} mt-1`} value={f.peak_price_multiplier} onChange={(e) => set("peak_price_multiplier", Number(e.target.value))} />
        </label>

        <input
          className={input}
          placeholder="Rasm URL lar (vergul bilan)"
          value={(f.images ?? []).join(", ")}
          onChange={(e) => set("images", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />

        {save.isError && <p className="text-xs text-red-600">Saqlashda xatolik.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500">Bekor</button>
          <button disabled={save.isPending} className="rounded-lg bg-pitch-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {save.isPending ? "..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
