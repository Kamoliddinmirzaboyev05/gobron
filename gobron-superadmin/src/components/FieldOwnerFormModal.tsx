import { useState } from "react";
import { Modal } from "./ui";
import { useSaveFieldOwner, type FieldOwnerInput } from "../hooks/useFieldOwners";
import { useUsers } from "../hooks/useUsers";
import type { FieldOwner } from "../types";

export default function FieldOwnerFormModal({
  owner,
  onClose,
}: {
  owner: FieldOwner | null;
  onClose: () => void;
}) {
  const save = useSaveFieldOwner();
  const { data: candidateUsers } = useUsers({ role: "field_owner" });
  const [f, setF] = useState<FieldOwnerInput>({
    user_id: owner?.user_id,
    business_name: owner?.business_name ?? "",
    contact_phone: owner?.contact_phone ?? "",
  });

  const set = <K extends keyof FieldOwnerInput>(k: K, v: FieldOwnerInput[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({ id: owner?.id, data: f }, { onSuccess: onClose });
  }

  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm";

  return (
    <Modal title={owner ? "Maydon egasini tahrirlash" : "Yangi maydon egasi"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {!owner && (
          <label className="block text-xs text-gray-500">
            Foydalanuvchi (role: field_owner)
            <select
              required
              className={`${input} mt-1`}
              value={f.user_id ?? ""}
              onChange={(e) => set("user_id", Number(e.target.value))}
            >
              <option value="" disabled>
                Tanlang...
              </option>
              {candidateUsers?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.phone} (#{u.id})
                </option>
              ))}
            </select>
          </label>
        )}
        <input
          className={input}
          placeholder="Biznes nomi"
          value={f.business_name ?? ""}
          onChange={(e) => set("business_name", e.target.value)}
          required
        />
        <input
          className={input}
          placeholder="Bog'lanish telefoni"
          value={f.contact_phone ?? ""}
          onChange={(e) => set("contact_phone", e.target.value)}
        />
        {save.isError && <p className="text-xs text-red-600">Saqlashda xatolik.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500">
            Bekor
          </button>
          <button
            disabled={save.isPending}
            className="rounded-lg bg-pitch-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {save.isPending ? "..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
