import { useState } from "react";
import { Send, Image as ImageIcon } from "lucide-react";
import { useBroadcasts, useCreateBroadcast } from "../hooks/useBroadcasts";
import { Badge, Empty, Spinner } from "../components/ui";

export default function Broadcasts() {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const { data, isLoading } = useBroadcasts();
  const create = useCreateBroadcast();

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    create.mutate(
      { text: text.trim(), image_url: imageUrl.trim() || null },
      { onSuccess: () => { setText(""); setImageUrl(""); } },
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Bot e'lonlari</h1>

      <form onSubmit={send} className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="E'lon matni..."
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 px-3">
          <ImageIcon className="h-4 w-4 text-gray-400" />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Rasm URL (ixtiyoriy)"
            className="flex-1 py-2 text-sm outline-none"
          />
        </div>
        <button
          disabled={create.isPending || !text.trim()}
          className="mt-3 flex items-center gap-2 rounded-lg bg-pitch-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {create.isPending ? "Yuborilmoqda..." : "Barchaga yuborish"}
        </button>
      </form>

      <h2 className="mb-3 font-semibold">Tarix</h2>
      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <Empty>Hali e'lon yuborilmagan</Empty>
      ) : (
        <div className="grid gap-3">
          {data.map((b) => (
            <div key={b.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm">{b.text}</p>
                <Badge value={b.status} />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Yuborildi: {b.sent_count} · Xato: {b.failed_count}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
