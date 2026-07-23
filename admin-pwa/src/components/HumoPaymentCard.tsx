/**
 * Multi-step Humo/Uzcard P2P payment UI (reference: balance top-up style).
 * Steps: method → confirm amount → pay (unique sum + card + timer).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchActivePaymentIntent,
  fetchPaymentIntents,
  startPaymentIntent,
  type PaymentIntentStart,
} from '../api/paymentIntents'
import { fetchPaymentSettings, type PaymentSettings } from '../api/paymentSettings'

type Method = 'humo' | 'uzcard'
type Step = 'method' | 'amount' | 'pay' | 'success'

function formatSom(n: number): string {
  return n.toLocaleString('uz-UZ')
}

function formatCard(n: string): string {
  return n.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function mmss(total: number): string {
  const s = Math.max(0, total)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function HumoPaymentCard() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [session, setSession] = useState<PaymentIntentStart | null>(null)
  const [left, setLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'card' | 'amount' | null>(null)
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<Method>('humo')
  const [step, setStep] = useState<Step>('method')

  const load = useCallback(async () => {
    setError('')
    try {
      const s = await fetchPaymentSettings()
      setSettings(s)
    } catch {
      setSettings(null)
      setError("To'lov ma'lumotlarini yuklab bo'lmadi")
    }
    try {
      const active = await fetchActivePaymentIntent()
      setSession(active)
      if (active?.intent.status === 'pending') {
        setLeft(active.ttl_seconds)
        setStep('pay')
      }
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Countdown
  useEffect(() => {
    if (!session || session.intent.status !== 'pending') return
    const ends = new Date(session.intent.expires_at).getTime()
    const tick = () => {
      const sec = Math.max(0, Math.floor((ends - Date.now()) / 1000))
      setLeft(sec)
      if (sec <= 0) {
        setSession((prev) =>
          prev
            ? { ...prev, intent: { ...prev.intent, status: 'expired' }, ttl_seconds: 0 }
            : prev,
        )
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [session?.intent.id, session?.intent.expires_at, session?.intent.status])

  // Poll paid
  useEffect(() => {
    if (!session || session.intent.status !== 'pending') return
    const intentId = session.intent.id
    const id = window.setInterval(async () => {
      try {
        const active = await fetchActivePaymentIntent()
        if (active && active.intent.id === intentId) {
          setSession(active)
          setLeft(active.ttl_seconds)
          return
        }
        const all = await fetchPaymentIntents()
        const row = all.find((x) => x.id === intentId)
        if (!row) return
        if (row.status === 'paid') {
          setSession((prev) =>
            prev
              ? { ...prev, intent: { ...prev.intent, status: 'paid' }, ttl_seconds: 0 }
              : prev,
          )
          setStep('success')
        } else if (row.status === 'expired' || row.status === 'expired_paid') {
          setSession((prev) =>
            prev
              ? { ...prev, intent: { ...prev.intent, status: row.status }, ttl_seconds: 0 }
              : prev,
          )
        }
      } catch {
        /* offline ok */
      }
    }, 3000)
    return () => window.clearInterval(id)
  }, [session?.intent.id, session?.intent.status])

  const progress = useMemo(() => {
    if (!session) return 0
    const windowSec = 15 * 60
    return Math.min(100, Math.max(0, ((windowSec - left) / windowSec) * 100))
  }, [session, left])

  async function handleContinueToPay() {
    setBusy(true)
    setError('')
    try {
      const started = await startPaymentIntent()
      setSession(started)
      setLeft(started.ttl_seconds)
      setStep('pay')
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "To'lovni boshlab bo'lmadi"
      setError(typeof msg === 'string' ? msg : "To'lovni boshlab bo'lmadi")
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy(kind: 'card' | 'amount', value: string) {
    const plain = kind === 'card' ? value.replace(/\s/g, '') : String(value).replace(/\s/g, '')
    const ok = await copyText(plain)
    if (ok) {
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1600)
    }
  }

  function resetFlow() {
    setSession(null)
    setStep('method')
    setError('')
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    )
  }

  if (!settings?.card_number) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40">
        <p className="font-semibold text-amber-900 dark:text-amber-100">To'lov sozlanmagan</p>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
          Superadmin karta raqamini kiritishi kerak.
        </p>
      </div>
    )
  }

  const base = Number(settings.subscription_amount ?? 50000)
  const intent = session?.intent
  const isPending = intent?.status === 'pending' && left > 0
  const isPaid = intent?.status === 'paid' || step === 'success'
  const isExpired =
    intent?.status === 'expired' ||
    intent?.status === 'expired_paid' ||
    (intent?.status === 'pending' && left <= 0)

  // ── Success ──────────────────────────────────────────────
  if (isPaid) {
    return (
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center text-white shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl shadow-lg shadow-emerald-500/30">
          ✓
        </div>
        <p className="text-xl font-bold">To'lov qabul qilindi!</p>
        <p className="mt-2 text-sm text-slate-300">Obuna faollashtirildi</p>
        {intent && (
          <p className="mt-4 font-mono text-2xl font-bold text-sky-300">
            {formatSom(intent.unique_amount)} so'm
          </p>
        )}
        <button
          type="button"
          onClick={resetFlow}
          className="mt-6 w-full rounded-2xl bg-sky-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 active:scale-[0.98]"
        >
          Yopish
        </button>
      </div>
    )
  }

  // ── Pay screen (exact amount + card + timer) ──────────────
  if (step === 'pay' && intent && (isPending || isExpired)) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isExpired) resetFlow()
              else setStep('amount')
            }}
            className="text-sm font-semibold text-slate-500 dark:text-slate-400"
          >
            ← Orqaga
          </button>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">To'lov</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-start gap-2 rounded-2xl bg-amber-500/15 px-3 py-3 ring-1 ring-amber-500/30">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-sm">
              ⚠️
            </span>
            <p className="text-[11px] font-semibold leading-snug text-amber-800 dark:text-amber-200">
              Diqqat! Faqat ko'rsatilgan summani yuboring
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-2xl bg-emerald-500/15 px-3 py-3 ring-1 ring-emerald-500/30">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm text-white">
              🎧
            </span>
            <p className="text-[11px] font-semibold leading-snug text-emerald-800 dark:text-emerald-200">
              24/7 yordam
            </p>
          </div>
        </div>

        {/* Exact amount */}
        <div className="rounded-2xl bg-slate-900 px-4 py-5 text-center shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            AYNAN shu summani o'tkazing
          </p>
          <button
            type="button"
            onClick={() => handleCopy('amount', String(intent.unique_amount))}
            className="mt-2 w-full"
          >
            <p className="text-4xl font-extrabold tabular-nums tracking-tight text-sky-400">
              {formatSom(intent.unique_amount)}
              <span className="ml-2 text-lg font-semibold text-slate-400">so'm</span>
            </p>
            <p className="mt-2 text-xs font-medium text-sky-300/80">
              {copied === 'amount' ? 'Nusxalandi ✓' : '📋 Bosib nusxalang'}
            </p>
          </button>
        </div>

        {/* Timer */}
        <div className="rounded-2xl bg-slate-900 px-4 py-3.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="text-base">⏱</span> Karta amal qiladi
            </span>
            <span
              className={`font-mono text-lg font-bold tabular-nums ${
                left < 120 ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              {mmss(left)}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                left < 120 ? 'bg-red-500' : 'bg-sky-500'
              }`}
              style={{ width: `${100 - progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-slate-900 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xl font-bold tracking-[0.12em] text-white">
                {formatCard(session?.card_number || settings.card_number)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-300">
                  {method === 'humo' ? 'HUMO' : 'UZCARD'}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {session?.card_holder || settings.card_holder}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy('card', session?.card_number || settings.card_number)
              }
              className="rounded-xl bg-slate-800 p-2.5 text-slate-300 ring-1 ring-slate-700 active:bg-slate-700"
              title="Nusxa"
            >
              📋
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              handleCopy('card', session?.card_number || settings.card_number)
            }
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-sky-600 to-blue-500 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/20 active:scale-[0.99]"
          >
            {copied === 'card' ? 'Nusxalandi ✓' : '📋 Nusxa olish'}
          </button>
        </div>

        <ul className="space-y-2 px-1 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="text-emerald-500">✓</span>
            Summani 1 so'mga ham o'zgartirmang
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500">✓</span>
            {Math.ceil(left / 60) || 15} daqiqa ichida to'lang
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500">✓</span>
            To'lov avtomatik tekshiriladi (1–2 daqiqa)
          </li>
        </ul>

        {isExpired && (
          <div className="rounded-2xl bg-red-500/10 p-4 text-center ring-1 ring-red-500/30">
            <p className="font-semibold text-red-600 dark:text-red-400">Vaqt tugadi</p>
            <button
              type="button"
              onClick={() => {
                resetFlow()
                setStep('amount')
              }}
              className="mt-3 w-full rounded-2xl bg-sky-500 py-3 text-sm font-bold text-white"
            >
              Qayta boshlash
            </button>
          </div>
        )}

        {!isExpired && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-sky-500/10 py-3 text-xs font-semibold text-sky-700 dark:text-sky-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
            To'lov kutilmoqda…
          </div>
        )}
      </div>
    )
  }

  // ── Method + Amount steps ────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          To'lov
        </p>
        <h2 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
          Obuna to'lovi
        </h2>
      </div>

      {/* Balance-style card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-5 py-6 text-center shadow-xl ring-1 ring-white/5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Obuna summasi
        </p>
        <p className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight text-sky-400">
          {formatSom(base)}
          <span className="ml-2 text-lg font-semibold text-slate-400">so'm</span>
        </p>
      </div>

      {/* Method */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
          To'lov usuli
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <MethodTile
            active={method === 'humo'}
            onClick={() => setMethod('humo')}
            title="HUMO"
            sub="Kartaga o'tkazma"
            icon={
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-lg font-black text-white">
                H
              </span>
            }
          />
          <MethodTile
            active={method === 'uzcard'}
            onClick={() => setMethod('uzcard')}
            title="UZCARD"
            sub="Kartaga o'tkazma"
            icon={
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">
                U
              </span>
            }
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Eng kam: {formatSom(base)} so'm · usul: {method === 'humo' ? 'Humo' : 'Uzcard'} ilovasi
        </p>
      </div>

      {/* Steps */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
          To'ldirish bosqichlari
        </p>
        <ol className="space-y-3">
          {[
            "To'lov usuli va summani tanlang",
            "Ko'rsatilgan kartaga AYNAN shu summani o'tkazing (1 so'mga ham o'zgartirmang)",
            "To'lov avtomatik tekshiriladi (1–2 daqiqa)",
            'Obunangiz faollashadi',
          ].map((text, i) => (
            <li key={text} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-snug">{text}</span>
            </li>
          ))}
        </ol>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={handleContinueToPay}
        className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-sky-500/25 transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? 'Yaratilmoqda…' : 'Davom etish'}
      </button>

      <p className="text-center text-[11px] text-slate-400">
        Keyingi qadamda unikal summa va karta ko'rsatiladi
      </p>
    </div>
  )
}

function MethodTile({
  active,
  onClick,
  title,
  sub,
  icon,
}: {
  active: boolean
  onClick: () => void
  title: string
  sub: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition ring-2 ${
        active
          ? 'bg-slate-900 ring-sky-400 shadow-lg shadow-sky-500/10'
          : 'bg-slate-100 ring-transparent dark:bg-slate-800/80'
      }`}
    >
      {icon}
      <div>
        <p
          className={`text-sm font-bold ${
            active ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
        >
          {title}
        </p>
        <p
          className={`text-[11px] ${
            active ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {sub}
        </p>
      </div>
    </button>
  )
}
