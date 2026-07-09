import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useFields } from "../hooks/useFields";
import FieldCard from "../components/FieldCard";
import { ErrorBox, Spinner } from "../components/ui";

export default function Home() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: fields, isLoading, error } = useFields();

  const uniqueFields = [];
  const seenOwners = new Set();
  for (const f of fields || []) {
    if (!seenOwners.has(f.owner_id)) {
      seenOwners.add(f.owner_id);
      uniqueFields.push(f);
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(q.trim() ? `/fields?search=${encodeURIComponent(q.trim())}` : "/fields");
  }

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pitch-700 via-pitch-600 to-pitch-800 px-5 pb-12 pt-16 text-white shadow-xl">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        
        <div className="relative z-10">
          <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium tracking-wide backdrop-blur-md border border-white/10">
            Yangi avlod bron tizimi 🚀
          </span>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight drop-shadow-md">
            Eng yaxshi maydonlar <br /> sizning qo'lingizda
          </h1>
          <p className="mt-3 text-sm text-pitch-100 font-medium max-w-[280px]">
            O'zingizga yaqin va qulay maydonlarni toping va tezkor so'rov yuboring.
          </p>
          
          <form onSubmit={submitSearch} className="mt-6 flex items-center gap-2 rounded-2xl bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl border border-white/20 transform transition-all focus-within:scale-[1.02]">
            <Search className="ml-3 h-5 w-5 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Maydon nomi yoki manzil..."
              className="flex-1 bg-transparent py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 font-medium"
            />
            <button className="rounded-xl bg-gradient-to-r from-pitch-600 to-pitch-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-pitch-500 hover:to-pitch-400 transition-all active:scale-95">
              Qidirish
            </button>
          </form>
        </div>
      </section>

      {/* Popular fields */}
      <section className="px-5 py-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Tavsiya etiladi</h2>
            <p className="text-sm text-gray-500 font-medium">Eng yuqori baholangan maydonlar</p>
          </div>
          <button onClick={() => navigate('/fields')} className="text-sm font-semibold text-pitch-600 active:text-pitch-700">
            Barchasi
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : error ? (
          <ErrorBox message="Maydonlarni yuklab bo'lmadi." />
        ) : (
          <div className="grid gap-5">
            {uniqueFields.slice(0, 6).map((f) => (
              <FieldCard key={f.id} field={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
