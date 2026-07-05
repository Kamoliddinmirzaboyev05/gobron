import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useFields } from "../hooks/useFields";
import FieldCard from "../components/FieldCard";
import { Spinner } from "../components/ui";

export default function Home() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: fields, isLoading } = useFields({ min_rating: 4 });

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(q.trim() ? `/fields?search=${encodeURIComponent(q.trim())}` : "/fields");
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-pitch-600 to-pitch-700 px-5 pb-8 pt-10 text-white">
        <h1 className="text-2xl font-bold leading-tight">
          Sun'iy maydonni <br /> bir daqiqada bron qiling ⚽
        </h1>
        <p className="mt-2 text-sm text-pitch-100">
          Eng yaqin maydonlarni toping va bo'sh vaqtni tanlang.
        </p>
        <form onSubmit={submitSearch} className="mt-5 flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-lg">
          <Search className="ml-2 h-5 w-5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Maydon yoki manzil qidiring"
            className="flex-1 bg-transparent py-2 text-sm text-gray-900 outline-none"
          />
          <button className="rounded-lg bg-pitch-600 px-4 py-2 text-sm font-medium text-white">
            Qidirish
          </button>
        </form>
      </section>

      {/* Popular fields */}
      <section className="px-4 py-5">
        <h2 className="mb-3 text-lg font-semibold">Mashhur maydonlar</h2>
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="grid gap-4">
            {fields?.slice(0, 6).map((f) => (
              <FieldCard key={f.id} field={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
