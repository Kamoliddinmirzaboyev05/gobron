import { useState } from "react";
import { Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { useBanners, useCreateBanner, useDeleteBanner } from "../hooks/useBanners";
import { uploadImage } from "../api/media";
import { Empty, Spinner } from "../components/ui";

export default function Banners() {
  const { data, isLoading } = useBanners();
  const create = useCreateBanner();
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
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl) return;
    create.mutate(
      { image_url: imageUrl, link: link.trim() || null, sort_order: Number(sortOrder) || 0 },
      { onSuccess: () => { setImageUrl(""); setLink(""); setSortOrder("0"); } },
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Bannerlar</h1>

      <form onSubmit={submit} className="mb-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        {imageUrl ? (
          <div className="relative h-40 overflow-hidden rounded-lg bg-gray-100">
            <img src={imageUrl} alt="Banner" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
            <ImageIcon className="mb-1 h-5 w-5" />
            {uploading ? "Yuklanmoqda..." : "Rasm tanlash"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Havola (ixtiyoriy)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-gray-500">
            Tartib
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
            />
          </label>
        </div>
        <button
          disabled={create.isPending || uploading || !imageUrl}
          className="mt-3 flex items-center gap-2 rounded-lg bg-pitch-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {create.isPending ? "Qo'shilmoqda..." : "Qo'shish"}
        </button>
      </form>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <Empty>Hali banner qo'shilmagan</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {data.map((b) => (
            <div key={b.id} className="relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              <img src={b.image_url} alt="" className="h-28 w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                #{b.sort_order}
              </span>
              <div className="flex items-center justify-between p-2.5">
                <p className="truncate text-xs text-gray-500">{b.link || "Havolasiz"}</p>
                <button
                  onClick={() => confirm("Banner o'chirilsinmi?") && del.mutate(b.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
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
