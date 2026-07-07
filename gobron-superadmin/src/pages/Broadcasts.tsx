import { useState } from "react";
import { Send, Image as ImageIcon } from "lucide-react";
import { useBroadcasts, useCreateBroadcast } from "../hooks/useBroadcasts";
import { Badge, Empty, Spinner } from "../components/ui";
import type { BroadcastAudience } from "../types";

export default function Broadcasts() {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const { data, isLoading } = useBroadcasts();
  const create = useCreateBroadcast();
  const audienceOptions: Array<{ value: BroadcastAudience; label: string }> = [
    { value: "all", label: "Hammaga" },
    { value: "bot_users", label: "Bot foydalanuvchilari" },
    { value: "field_owners", label: "Maydon egalari" },
  ];

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    create.mutate(
      { text: text.trim(), image_url: imageUrl.trim() || null, audience },
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
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {audienceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAudience(option.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                audience === option.value
                  ? "border-pitch-600 bg-pitch-50 text-pitch-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {option.label}
            </button>
          ))}
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
              <p className="mt-1 text-xs text-gray-500">
                Qabul qiluvchi: {b.audience === "all" ? "Hammaga" : b.audience === "bot_users" ? "Bot foydalanuvchilari" : "Maydon egalari"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
