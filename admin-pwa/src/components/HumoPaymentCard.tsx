/**
 * Humo P2P payment UX:
 *  - unique amount (base + tip)
 *  - card details with copy
 *  - live countdown
 *  - status polling until paid / expired
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchActivePaymentIntent,
  fetchPaymentIntents,
  startPaymentIntent,
  type PaymentIntentStart,
} from '../api/paymentIntents'
import { fetchPaymentSettings, type PaymentSettings } from '../api/paymentSettings'

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
  const [paidFlash, setPaidFlash] = useState(false)
  const [loading, setLoading] = useState(true)
  /** Intent API yo'q (404) bo'lsa ham karta + summa ko'rsatiladi. */
  const [autoPayReady, setAutoPayReady] = useState(true)

  const load = useCallback(async () => {
    setError('')
    // Settings va active intent alohida — intent 404 (deploy yo'q) bo'lsa
    // ham karta rekvizitlari ko'rinsin, "sozlanmagan" chiqmasin.
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
      setAutoPayReady(true)
      if (active) setLeft(active.ttl_seconds)
    } catch {
      setSession(null)
      setAutoPayReady(false)
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

  // Poll while pending — detect paid via history when active disappears
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
        // Active gone → check final status of this intent
        const all = await fetchPaymentIntents()
        const row = all.find((x) => x.id === intentId)
        if (!row) return
        if (row.status === 'paid') {
          setPaidFlash(true)
          setSession((prev) =>
            prev
              ? { ...prev, intent: { ...prev.intent, status: 'paid' }, ttl_seconds: 0 }
              : prev,
          )
        } else if (row.status === 'expired' || row.status === 'expired_paid') {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  intent: { ...prev.intent, status: row.status },
                  ttl_seconds: 0,
                }
              : prev,
          )
        }
      } catch {
        /* keep UI alive offline */
      }
    }, 3000)
    return () => window.clearInterval(id)
  }, [session?.intent.id, session?.intent.status])

  const progress = useMemo(() => {
    if (!session) return 0
    const total = 15 * 60
    return Math.min(100, Math.max(0, ((total - left) / total) * 100))
  }, [session, left])

  async function handleStart() {
    setBusy(true)
    setError('')
    setPaidFlash(false)
    try {
      const started = await startPaymentIntent()
      setSession(started)
      setLeft(started.ttl_seconds)
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
    const ok = await copyText(value.replace(/\s/g, kind === 'card' ? '' : ''))
    if (ok) {
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1500)
    }
  }

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    )
  }

  if (!settings?.card_number) {
    return (
      <div className="card p-5 border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <p className="font-semibold text-amber-800 dark:text-amber-200">To'lov hali sozlanmagan</p>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
          Superadmin karta rekvizitlarini kiritishi kerak.
        </p>
      </div>
    )
  }

  const base = Number(settings.subscription_amount ?? 50000)
  const intent = session?.intent
  const isPending = intent?.status === 'pending' && left > 0
  const isPaid = intent?.status === 'paid' || paidFlash
  const isExpired = intent?.status === 'expired' || (intent?.status === 'pending' && left <= 0)

  return (
    <div className="space-y-4">
      {/* Card visual */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-primary to-teal-800 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">Humo / Uzcard</p>
              <p className="text-sm font-medium opacity-90 mt-0.5">
                {settings.bank_name || 'Platforma kartasi'}
              </p>
            </div>
            <div className="rounded-lg bg-white/15 px-2.5 py-1 text-[10px] font-bold tracking-wide">
              P2P
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopy('card', settings.card_number)}
            className="w-full text-left group"
          >
            <p className="text-xs opacity-70 mb-1">Karta raqami · bosib nusxalang</p>
            <p className="font-mono text-xl tracking-[0.18em] group-active:scale-[0.99] transition">
              {formatCard(settings.card_number)}
            </p>
            {copied === 'card' && (
              <p className="text-xs text-emerald-100 mt-1">Nusxalandi ✓</p>
            )}
          </button>
          <p className="mt-4 text-sm font-medium">{settings.card_holder}</p>
        </div>
      </div>

      {/* Intent panel */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {autoPayReady ? "Avtomatik to'lov (Humo)" : "Obuna to'lovi"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {autoPayReady
                ? "Aniq summani o'tkazing — tizim o'zi tasdiqlaydi (15 daqiqa)."
                : "Quyidagi kartaga obuna summasini o'tkazing."}
            </p>
          </div>
        </div>

        {!isPending && !isPaid && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 mb-4">
            <button
              type="button"
              onClick={() => handleCopy('amount', String(base))}
              className="w-full text-left"
            >
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Obuna summasi:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatSom(base)} so'm
                </span>
              </p>
              {copied === 'amount' && (
                <p className="text-xs text-primary mt-1">Summa nusxalandi ✓</p>
              )}
            </button>
            {autoPayReady ? (
              <p className="text-xs text-gray-500 mt-1">
                Tizim 1–99 so'm qo'shib unikal summa beradi (masalan {formatSom(base + 14)}).
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Bosib summani nusxalang, kartaga o'tkazing.
              </p>
            )}
          </div>
        )}

        {isPending && intent && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary-light/40 dark:bg-primary/10 p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                O'tkaziladigan aniq summa
              </p>
              <button
                type="button"
                onClick={() => handleCopy('amount', String(intent.unique_amount))}
                className="w-full"
              >
                <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white tracking-tight">
                  {formatSom(intent.unique_amount)}
                  <span className="text-lg font-semibold text-gray-500 ml-1">so'm</span>
                </p>
                <p className="text-xs text-primary mt-2 font-medium">
                  {copied === 'amount' ? 'Summa nusxalandi ✓' : 'Bosib nusxalang'}
                </p>
              </button>
              <p className="text-[11px] text-gray-500 mt-3">
                Asos {formatSom(intent.base_amount)} + unikal{' '}
                {intent.unique_amount - intent.base_amount} so'm
              </p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Vaqt qoldi</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    left < 120 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {mmss(left)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    left < 120 ? 'bg-red-500' : 'bg-primary'
                  }`}
                  style={{ width: `${100 - progress}%` }}
                />
              </div>
            </div>

            <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-decimal list-inside">
              <li>Yuqoridagi kartaga Humo orqali o'tkazma qiling</li>
              <li>
                Summani <strong>aniq</strong> kiriting ({formatSom(intent.unique_amount)})
              </li>
              <li>To'lov tushishi bilan shu yerda avtomatik tasdiqlanadi</li>
            </ol>

            <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              To'lov kutilmoqda… sahifani yopmang
            </div>
          </div>
        )}

        {isPaid && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white text-2xl">
              ✓
            </div>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
              To'lov qabul qilindi!
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
              Obuna faollashtirildi. Rahmat!
            </p>
            {intent && (
              <p className="text-xs text-emerald-600 mt-3 font-mono">
                {formatSom(intent.unique_amount)} so'm
              </p>
            )}
            <button type="button" onClick={handleStart} className="btn-primary mt-4 w-full">
              Yangi to'lov
            </button>
          </div>
        )}

        {isExpired && !isPaid && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 mb-3 text-center">
            <p className="font-medium text-gray-800 dark:text-gray-200">Vaqt tugadi</p>
            <p className="text-sm text-gray-500 mt-1">
              Yangi unikal summa bilan qayta boshlang.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        {autoPayReady && (!isPending || isExpired) && !isPaid && (
          <button
            type="button"
            disabled={busy}
            onClick={handleStart}
            className="btn-primary w-full mt-1"
          >
            {busy ? 'Yaratilmoqda…' : isExpired ? 'Qayta boshlash' : "To'lovni boshlash"}
          </button>
        )}
      </div>
    </div>
  )
}
