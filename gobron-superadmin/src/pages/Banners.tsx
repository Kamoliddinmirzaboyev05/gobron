import { useState } from "react";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  Upload,
} from "lucide-react";
import {
  useBanners,
  useCreateBanner,
  useDeleteBanner,
  useUpdateBanner,
} from "../hooks/useBanners";
import { uploadImage } from "../api/media";
import { Empty, Spinner } from "../components/ui";

export default function Banners() {
  const { data, isLoading } = useBanners();
  const create = useCreateBanner();
  const update = useUpdateBanner();
  const del = useDeleteBanner();
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setImageUrl(await uploadImage(file));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl) return;
    create.mutate(
      {
        image_url: imageUrl,
        link: link.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_active: true,
      },
      {
        onSuccess: () => {
          setImageUrl("");
          setLink("");
          setSortOrder("0");
        },
      },
    );
  }

  const activeCount = data?.filter((b) => b.is_active).length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">TMA posterlar</h1>
        <p className="mt-1 text-sm text-gray-400">
          User Mini App bosh sahifa hero slideri. Tavsiya: 16:9 yoki 2:1, kamida
          1200×600 px.
        </p>
      </div>

      {/* Upload form */}
      <form
        onSubmit={submit}
        className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
      >
        <div className="border-b border-gray-100 bg-gradient-to-r from-pitch-50 to-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-pitch-800">
            <Upload className="h-4 w-4" />
            Yangi poster yuklash
          </h2>
        </div>

        <div className="p-5">
          {imageUrl ? (
            <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
              <img
                src={imageUrl}
                alt="Banner preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                <p className="text-xs font-medium text-white">
                  TMA dagi ko'rinish (taxminiy)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute right-2 top-2 rounded-full bg-black/55 p-2 text-white backdrop-blur hover:bg-black/70"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex aspect-[2/1] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-pitch-300 hover:bg-pitch-50/40">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                <ImageIcon className="h-6 w-6 text-pitch-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {uploading ? "Yuklanmoqda…" : "Poster rasmini tanlang"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                JPEG, PNG, WEBP · max 20MB
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
                disabled={uploading}
              />
            </label>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className="block text-xs font-medium text-gray-500">
              <span className="mb-1 inline-flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" /> Havola (ixtiyoriy)
              </span>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-gray-500">
              Tartib
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={create.isPending || uploading || !imageUrl}
            className="mt-4 flex items-center gap-2 rounded-xl bg-pitch-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pitch-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {create.isPending ? "Saqlanmoqda…" : "Sliderga qo'shish"}
          </button>
        </div>
      </form>

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
        <Empty>Hali poster yo'q — yuqoridan yuklang</Empty>
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
                <img
                  src={b.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                  #{b.sort_order}
                </span>
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur ${
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
                  title={b.is_active ? "Yashirish" : "Ko'rsatish"}
                  onClick={() =>
                    update.mutate({ id: b.id, data: { is_active: !b.is_active } })
                  }
                  className="rounded-lg p-2 text-gray-400 hover:bg-pitch-50 hover:text-pitch-600"
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
                  onClick={() =>
                    confirm("Poster o'chirilsinmi?") && del.mutate(b.id)
                  }
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
