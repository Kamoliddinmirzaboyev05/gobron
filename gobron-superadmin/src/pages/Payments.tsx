import { useEffect, useState } from "react";
import { CreditCard, Radio } from "lucide-react";
import {
  usePaymentSettings,
  useSavePaymentSettings,
} from "../hooks/usePaymentSettings";
import { usePaymentIntents, useUnmatchedTransactions } from "../hooks/useHumoPayments";
import { Badge, Spinner, Empty } from "../components/ui";
import { formatPrice } from "../lib/format";

function CardSettings() {
  const { data: settings } = usePaymentSettings();
  const save = useSavePaymentSettings();
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [amount, setAmount] = useState("50000");

  useEffect(() => {
    if (!settings) return;
    setCardNumber(settings.card_number);
    setCardHolder(settings.card_holder);
    setBankName(settings.bank_name ?? "");
    setAmount(String(settings.subscription_amount ?? 50000));
  }, [settings]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({
      card_number: cardNumber,
      card_holder: cardHolder,
      bank_name: bankName.trim() || null,
      subscription_amount: Number(amount) || 50000,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
    >
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-pitch-600" />
        <h2 className="font-semibold">Humo P2P rekvizitlari</h2>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Maydon egalari shu kartaga unikal summa o'tkazadi. Matcher avtomatik
        tasdiqlaydi.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-gray-500">
          Karta raqami
          <input
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            inputMode="numeric"
            placeholder="8600 0000 0000 0000"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Karta egasi
          <input
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            placeholder="Ism Familiya"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Bank (ixtiyoriy)
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Oylik obuna (so'm)
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1000}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      {save.isError && (
        <p className="mt-3 text-sm text-red-600">Saqlab bo'lmadi. Ma'lumotlarni tekshiring.</p>
      )}
      {save.isSuccess && <p className="mt-3 text-sm text-pitch-600">Saqlandi ✅</p>}

      <button
        disabled={save.isPending || !cardNumber || !cardHolder}
        className="mt-4 rounded-xl bg-pitch-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {save.isPending ? "Saqlanmoqda..." : "Saqlash"}
      </button>
    </form>
  );
}

const STATUS_BADGE: Record<string, { value: string; label: string }> = {
  pending: { value: "pending", label: "Kutilmoqda" },
  paid: { value: "confirmed", label: "To'langan" },
  expired: { value: "cancelled", label: "Muddati o'tgan" },
  expired_paid: { value: "pending", label: "Kechikkan to'lov" },
};

export default function Payments() {
  const [tab, setTab] = useState<"intents" | "unmatched">("intents");
  const { data: intents, isLoading: loadingIntents } = usePaymentIntents();
  const { data: unmatched, isLoading: loadingUnmatched } = useUnmatchedTransactions();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Humo to'lovlar</h1>
        <p className="mt-1 text-sm text-gray-400">
          Unikal summa bo'yicha avtomatik P2P matching
        </p>
      </div>

      <CardSettings />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("intents")}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            tab === "intents"
              ? "bg-pitch-600 text-white"
              : "bg-white text-gray-500 ring-1 ring-gray-200"
          }`}
        >
          Buyurtmalar {intents ? `(${intents.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("unmatched")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            tab === "unmatched"
              ? "bg-pitch-600 text-white"
              : "bg-white text-gray-500 ring-1 ring-gray-200"
          }`}
        >
          <Radio className="h-4 w-4" />
          Mos kelmagan{" "}
          {unmatched && unmatched.length > 0 ? `(${unmatched.length})` : ""}
        </button>
      </div>

      {tab === "intents" &&
        (loadingIntents ? (
          <Spinner />
        ) : !intents || intents.length === 0 ? (
          <Empty>Hali payment intent yo'q</Empty>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 text-left text-xs text-gray-400">
                <tr>
                  <th className="px-4 py-3">Egasi</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Unikal summa</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3">Yaratilgan</th>
                  <th className="px-4 py-3">To'langan</th>
                </tr>
              </thead>
              <tbody>
                {intents.map((p) => {
                  const b = STATUS_BADGE[p.status] ?? {
                    value: "pending",
                    label: p.status,
                  };
                  return (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium">{p.owner_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{p.owner_phone || "—"}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-pitch-700">
                        {formatPrice(p.unique_amount)}
                        <span className="ml-1 text-xs font-normal text-gray-400">
                          (base {p.base_amount})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={b.value} label={b.label} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(p.created_at).toLocaleString("uz-UZ")}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {p.paid_at ? new Date(p.paid_at).toLocaleString("uz-UZ") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

      {tab === "unmatched" &&
        (loadingUnmatched ? (
          <Spinner />
        ) : !unmatched || unmatched.length === 0 ? (
          <Empty>Mos kelmagan tranzaksiya yo'q — yaxshi belgi</Empty>
        ) : (
          <div className="space-y-3">
            {unmatched.map((u) => (
              <div
                key={u.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums text-pitch-700">
                    {u.amount != null ? formatPrice(u.amount) : "Summa noma'lum"}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    {u.reason}
                  </span>
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                  {u.raw_message}
                </pre>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(u.created_at).toLocaleString("uz-UZ")}
                </p>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
