import { useEffect, useState } from "react";
import {
  Radio,
  Shield,
  KeyRound,
  Smartphone,
  Bot,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  usePaymentSettings,
  useSavePaymentSettings,
} from "../hooks/usePaymentSettings";
import { usePaymentIntents, useUnmatchedTransactions } from "../hooks/useHumoPayments";
import { Badge, Spinner, Empty } from "../components/ui";
import { formatPrice } from "../lib/format";

function HumoCardSettings() {
  const { data: settings } = usePaymentSettings();
  const save = useSavePaymentSettings();
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [amount, setAmount] = useState("50000");

  // Telegram / 2FA
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [phone, setPhone] = useState("");
  const [twoFa, setTwoFa] = useState("");
  const [show2fa, setShow2fa] = useState(false);
  const [showHash, setShowHash] = useState(false);
  const [botUser, setBotUser] = useState("HUMOcardbot");
  const [session, setSession] = useState("");

  useEffect(() => {
    if (!settings) return;
    setCardNumber(settings.card_number);
    setCardHolder(settings.card_holder);
    setAmount(String(settings.subscription_amount ?? 50000));
    setApiId(settings.telegram_api_id ?? "");
    setApiHash(settings.telegram_api_hash ?? "");
    setPhone(settings.telegram_phone ?? "");
    setTwoFa(settings.telegram_2fa_password ?? "");
    setBotUser(settings.humo_bot_username ?? "HUMOcardbot");
    setSession(settings.telegram_session ?? "");
  }, [settings]);

  function submitCard(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({
      card_number: cardNumber,
      card_holder: cardHolder,
      bank_name: "HUMO",
      subscription_amount: Number(amount) || 50000,
      // keep telegram fields so PUT doesn't wipe (backend preserves None)
      telegram_api_id: apiId || null,
      telegram_api_hash: apiHash || null,
      telegram_phone: phone || null,
      telegram_2fa_password: twoFa || null,
      telegram_session: session || null,
      humo_bot_username: botUser || "HUMOcardbot",
    });
  }

  function submitTelegram(e: React.FormEvent) {
    e.preventDefault();
    const cn = (cardNumber || settings?.card_number || "").replace(/\s/g, "");
    if (cn.length < 16) {
      alert("Avval Humo karta raqamini saqlang (yuqoridagi forma).");
      return;
    }
    save.mutate({
      card_number: cardNumber || settings!.card_number,
      card_holder: cardHolder || settings?.card_holder || "HUMO",
      bank_name: "HUMO",
      subscription_amount: Number(amount) || settings?.subscription_amount || 50000,
      telegram_api_id: apiId.trim() || null,
      telegram_api_hash: apiHash.trim() || null,
      telegram_phone: phone.trim() || null,
      telegram_2fa_password: twoFa || null,
      telegram_session: session.trim() || null,
      humo_bot_username: (botUser || "HUMOcardbot").replace(/^@/, ""),
    });
  }

  const hasSession = Boolean(settings?.has_session || session.trim());
  const tgReady = Boolean(apiId && apiHash && phone);

  return (
    <div className="mb-8 space-y-5">
      {/* Humo card */}
      <form
        onSubmit={submitCard}
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-sky-50 to-white px-5 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 text-lg font-black text-white">
            H
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Humo karta rekvizitlari</h2>
            <p className="text-xs text-gray-500">
              Egalari shu kartaga unikal summa o'tkazadi
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <label className="text-xs font-medium text-gray-500 sm:col-span-2">
            Humo karta raqami
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              inputMode="numeric"
              placeholder="9860 0000 0000 0000"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-500">
            Karta egasi
            <input
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="ISM FAMILIYA"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm uppercase"
            />
          </label>
          <label className="text-xs font-medium text-gray-500">
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
        <div className="border-t border-gray-100 px-5 py-4">
          <button
            disabled={save.isPending || !cardNumber || !cardHolder}
            className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {save.isPending ? "Saqlanmoqda..." : "Kartani saqlash"}
          </button>
        </div>
      </form>

      {/* Telegram 2FA / matcher */}
      <form
        onSubmit={submitTelegram}
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 via-white to-sky-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Telegram userbot + 2FA</h2>
              <p className="text-xs text-gray-500">
                payment-matcher shu ma'lumotlar bilan @HUMOcardbot ni tinglaydi
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                tgReady
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
              }`}
            >
              {tgReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {tgReady ? "API tayyor" : "API to'ldiring"}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                hasSession
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {hasSession ? "Session bor" : "Session yo'q"}
            </span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-violet-50/80 px-4 py-3 text-xs leading-relaxed text-violet-900 ring-1 ring-violet-100">
            <strong>2FA (ikki bosqichli parol)</strong> — Telegram Settings → Privacy →
            Two-Step Verification dagi <em>cloud password</em>. Matcher login paytida shu
            parolni avtomatik ishlatadi (terminalda so‘ramaydi).
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-500">
              <span className="mb-1 inline-flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5" /> API ID
              </span>
              <input
                value={apiId}
                onChange={(e) => setApiId(e.target.value)}
                placeholder="39300699"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              <span className="mb-1 inline-flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5" /> API Hash
              </span>
              <div className="relative mt-1">
                <input
                  type={showHash ? "text" : "password"}
                  value={apiHash}
                  onChange={(e) => setApiHash(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowHash((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
                >
                  {showHash ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="text-xs font-medium text-gray-500">
              <span className="mb-1 inline-flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" /> Telefon (+998…)
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998901234567"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-500">
              <span className="mb-1 inline-flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> 2FA parol (cloud password)
              </span>
              <div className="relative mt-1">
                <input
                  type={show2fa ? "text" : "password"}
                  value={twoFa}
                  onChange={(e) => setTwoFa(e.target.value)}
                  placeholder="Telegram ikki bosqichli parol"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShow2fa((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
                >
                  {show2fa ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="text-xs font-medium text-gray-500 sm:col-span-2">
              <span className="mb-1 inline-flex items-center gap-1">
                <Bot className="h-3.5 w-3.5" /> Humo bot username
              </span>
              <input
                value={botUser}
                onChange={(e) => setBotUser(e.target.value)}
                placeholder="HUMOcardbot"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-500 sm:col-span-2">
              Telegram session (ixtiyoriy — matcher o'zi yozadi)
              <textarea
                value={session}
                onChange={(e) => setSession(e.target.value)}
                rows={2}
                placeholder="Birinchi login dan keyin avtomatik saqlanadi…"
                className="mt-1 w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-xs"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {save.isPending ? "Saqlanmoqda..." : "Telegram / 2FA saqlash"}
          </button>
          {save.isSuccess && (
            <span className="text-sm font-medium text-pitch-600">Saqlandi ✅</span>
          )}
          {save.isError && (
            <span className="text-sm text-red-600">Xatolik — ma'lumotlarni tekshiring</span>
          )}
        </div>
      </form>
    </div>
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
          Karta, Telegram 2FA va avtomatik match
        </p>
      </div>

      <HumoCardSettings />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("intents")}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            tab === "intents"
              ? "bg-sky-600 text-white"
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
              ? "bg-sky-600 text-white"
              : "bg-white text-gray-500 ring-1 ring-gray-200"
          }`}
        >
          <Radio className="h-4 w-4" />
          Mos kelmagan {unmatched && unmatched.length > 0 ? `(${unmatched.length})` : ""}
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
                  const b = STATUS_BADGE[p.status] ?? { value: "pending", label: p.status };
                  return (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium">{p.owner_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{p.owner_phone || "—"}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-sky-700">
                        {formatPrice(p.unique_amount)}
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
          <Empty>Mos kelmagan tranzaksiya yo'q</Empty>
        ) : (
          <div className="space-y-3">
            {unmatched.map((u) => (
              <div
                key={u.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
              >
                <div className="mb-2 flex justify-between gap-2">
                  <span className="font-semibold text-sky-700">
                    {u.amount != null ? formatPrice(u.amount) : "—"}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                    {u.reason}
                  </span>
                </div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                  {u.raw_message}
                </pre>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
