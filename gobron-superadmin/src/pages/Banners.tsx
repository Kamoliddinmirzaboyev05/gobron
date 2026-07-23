import { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  Upload,
  Type,
  AlignLeft,
  Pencil,
  X,
} from "lucide-react";
import {
  useBanners,
  useCreateBanner,
  useDeleteBanner,
  useUpdateBanner,
  type BannerInput,
} from "../hooks/useBanners";
import { uploadImage } from "../api/media";
import { ConfirmDialog, Empty, Modal, Spinner } from "../components/ui";
import type { Banner } from "../types";

type FormState = {
  imageUrl: string;
  title: string;
  description: string;
  link: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  imageUrl: "",
  title: "",
  description: "",
  link: "",
  sortOrder: "0",
  isActive: true,
});

function formFromBanner(b: Banner): FormState {
  return {
    imageUrl: b.image_url,
    title: b.title ?? "",
    description: b.description ?? "",
    link: b.link ?? "",
    sortOrder: String(b.sort_order ?? 0),
    isActive: b.is_active,
  };
}

function toInput(f: FormState): BannerInput {
  return {
    image_url: f.imageUrl,
    title: f.title.trim() || null,
    description: f.description.trim() || null,
    link: f.link.trim() || null,
    sort_order: Number(f.sortOrder) || 0,
    is_active: f.isActive,
  };
}

function BannerFormFields({
  form,
  setForm,
  uploading,
  onFile,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  uploading: boolean;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      {form.imageUrl ? (
        <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
          <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <p className="text-lg font-extrabold leading-tight">
              {form.title.trim() || "Sarlavha…"}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-white/90">
              {form.description.trim() || "Tavsif…"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => set("imageUrl", "")}
            className="absolute right-2 top-2 rounded-full bg-black/55 p-2 text-white hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex aspect-[2/1] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-pitch-300 hover:bg-pitch-50/40">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <ImageIcon className="h-6 w-6 text-pitch-600" />
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {uploading ? "Yuklanmoqda…" : "Rasm tanlash"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Tavsiya: 1200×600 px</p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
            disabled={uploading}
          />
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-gray-500 sm:col-span-2">
          <span className="mb-1 inline-flex items-center gap-1">
            <Type className="h-3.5 w-3.5" /> Sarlavha (title)
          </span>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Masalan: Bahorgi chegirma"
            maxLength={200}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pitch-400 focus:ring-2 focus:ring-pitch-100"
          />
        </label>
        <label className="block text-xs font-medium text-gray-500 sm:col-span-2">
          <span className="mb-1 inline-flex items-center gap-1">
            <AlignLeft className="h-3.5 w-3.5" /> Tavsif (description)
          </span>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Qisqa matn — rasm ostida chiqadi"
            maxLength={500}
            rows={2}
            className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pitch-400 focus:ring-2 focus:ring-pitch-100"
          />
        </label>
        <label className="block text-xs font-medium text-gray-500">
          <span className="mb-1 inline-flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5" /> Havola / button (ixtiyoriy)
          </span>
          <input
            value={form.link}
            onChange={(e) => set("link", e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pitch-400 focus:ring-2 focus:ring-pitch-100"
          />
        </label>
        <label className="block text-xs font-medium text-gray-500">
          Tartib
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pitch-400 focus:ring-2 focus:ring-pitch-100"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-pitch-600 focus:ring-pitch-500"
          />
          Faol (sliderda ko‘rinsin)
        </label>
      </div>
    </div>
  );
}

export default function Banners() {
  const { data, isLoading } = useBanners();
  const create = useCreateBanner();
  const update = useUpdateBanner();
  const del = useDeleteBanner();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  useEffect(() => {
    if (formOpen) {
      setForm(editing ? formFromBanner(editing) : emptyForm());
    }
  }, [formOpen, editing]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(b: Banner) {
    setEditing(b);
    setFormOpen(true);
  }

  function closeForm() {
    if (create.isPending || update.isPending || uploading) return;
    setFormOpen(false);
    setEditing(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.imageUrl) return;
    const payload = toInput(form);

    if (editing) {
      update.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditing(null);
          },
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          setFormOpen(false);
          setEditing(null);
        },
      });
    }
  }

  const activeCount = data?.filter((b) => b.is_active).length ?? 0;
  const saving = create.isPending || update.isPending;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">TMA posterlar</h1>
          <p className="mt-1 text-sm text-gray-400">
            Mini App hero slider. Title va description rasm ustida chiqadi.
            Tavsiya: 1200×600 px (2:1).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-pitch-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pitch-700"
        >
          <Plus className="h-4 w-4" />
          Yangi poster
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Barcha posterlar
          {data && (
            <span className="ml-2 font-normal text-gray-400">
              {activeCount} faol / {data.length} jami
            </span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Empty>Hali poster yo&apos;q</Empty>
          <button
            type="button"
            onClick={openCreate}
            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-pitch-600 hover:text-pitch-700"
          >
            <Plus className="h-4 w-4" />
            Birinchi posterni qo&apos;shish
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((b) => (
            <div
              key={b.id}
              className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition ${
                b.is_active ? "ring-gray-100" : "opacity-70 ring-gray-200"
              }`}
            >
              <div className="relative aspect-[2/1] bg-gray-100">
                <img src={b.image_url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 text-white">
                  <p className="truncate text-sm font-bold">{b.title || "—"}</p>
                  {b.description && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-white/85">
                      {b.description}
                    </p>
                  )}
                </div>
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                  #{b.sort_order}
                </span>
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    b.is_active
                      ? "bg-emerald-500/90 text-white"
                      : "bg-gray-800/70 text-white"
                  }`}
                >
                  {b.is_active ? "Faol" : "O'chiq"}
                </span>
              </div>
              <div className="flex items-center gap-1 p-2.5">
                <p className="min-w-0 flex-1 truncate text-xs text-gray-500">
                  {b.link || "Havolasiz"}
                </p>
                <button
                  type="button"
                  title="Tahrirlash"
                  onClick={() => openEdit(b)}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-pitch-50 hover:text-pitch-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title={b.is_active ? "Yashirish" : "Faollashtirish"}
                  onClick={() =>
                    update.mutate({ id: b.id, data: { is_active: !b.is_active } })
                  }
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-pitch-50 hover:text-pitch-600"
                >
                  {b.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  title="O'chirish"
                  onClick={() => setDeleteTarget(b)}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {formOpen && (
        <Modal
          title={editing ? "Posterni tahrirlash" : "Yangi poster"}
          onClose={closeForm}
          maxWidth="max-w-xl"
        >
          <form onSubmit={submit}>
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-pitch-700">
              <Upload className="h-3.5 w-3.5" />
              {editing ? `ID #${editing.id}` : "Sliderga yangi rasm"}
            </div>

            <BannerFormFields
              form={form}
              setForm={setForm}
              uploading={uploading}
              onFile={handleFile}
            />

            <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving || uploading || !form.imageUrl}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-pitch-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pitch-700 disabled:opacity-60"
              >
                {editing ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    {saving ? "Saqlanmoqda…" : "O'zgarishlarni saqlash"}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {saving ? "Saqlanmoqda…" : "Sliderga qo'shish"}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Posterni o'chirish"
        description={
          deleteTarget
            ? `"${deleteTarget.title || "Nomsiz poster"}" butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`
            : undefined
        }
        confirmLabel="Ha, o'chirish"
        cancelLabel="Bekor qilish"
        variant="danger"
        loading={del.isPending}
        onCancel={() => !del.isPending && setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
