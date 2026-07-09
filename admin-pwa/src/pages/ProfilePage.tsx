import { useState, useEffect } from 'react'
import { fetchMe, OwnerProfile } from '../api/auth'
import { fetchFields } from '../api/fields'
import type { Field } from '../types'
import { useLoad } from '../hooks/useLoad'
import { useAuthStore } from '../store/auth'
import { useThemeStore } from '../store/theme'
import { useNotificationPrefsStore } from '../store/notificationPrefs'
import { getSubscriptionStatus } from '../utils/subscription'
import { formatUzPhone, extractPhoneDigits } from '../utils/phone'
import { SoccerIcon } from '../components/BrandIcons'
import TopBar from '../components/TopBar'
import { uploadImage } from '../api/media'
import { fetchPaymentSettings, type PaymentSettings } from '../api/paymentSettings'
import { createSubscriptionPayment, fetchSubscriptionPayments, type SubscriptionPayment } from '../api/subscription'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'

export default function ProfilePage() {
  const logout = useAuthStore((s) => s.logout)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const notificationsEnabled = useNotificationPrefsStore((s) => s.enabled)
  const toggleNotifications = useNotificationPrefsStore((s) => s.toggle)

  const { data: profile } = useLoad<OwnerProfile>(() => fetchMe(), [])
  const { data: fields } = useLoad<Field[]>(() => fetchFields(), [])
  const { data: paymentSettings } = useLoad<PaymentSettings>(() => fetchPaymentSettings(), [])
  const monthlyPrice = fields?.[0]?.pricePerHour ?? 0
  const subscription = profile ? getSubscriptionStatus(profile.createdAt) : null

  const [amount, setAmount] = useState('')
  const [receiptImage, setReceiptImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [payments, setPayments] = useState<SubscriptionPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)

  async function loadPayments() {
    try {
      setPayments(await fetchSubscriptionPayments())
    } catch {
      console.error('Failed to load payments')
    } finally {
      setPaymentsLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  async function handlePaymentFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setPaymentError('')
    try {
      setReceiptImage(await uploadImage(file, () => {}))
    } catch {
      setPaymentError("Rasmni yuklashda xatolik yuz berdi.")
    } finally {
      setUploading(false)
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !receiptImage) {
      setPaymentError("Summa va chek rasmini kiritish majburiy.")
      return
    }
    setSaving(true)
    setPaymentError('')
    try {
      await createSubscriptionPayment(Number(amount), receiptImage)
      setAmount('')
      setReceiptImage('')
      loadPayments()
    } catch {
      setPaymentError("Xatolik yuz berdi. Qayta urinib ko'ring.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Profil" />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Avatar + identity */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
            <SoccerIcon size={80} />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{profile?.fullName || '—'}</p>
            <p className="text-gray-500 dark:text-gray-400">
              {profile?.phone ? formatUzPhone(extractPhoneDigits(profile.phone)) : '—'}
            </p>
          </div>
        </div>

        {/* Subscription */}
        {subscription && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {subscription.isTrial ? 'Bepul sinov davri' : 'Oylik obuna'}
              </p>
              <span
                className={`chip ${
                  subscription.isTrial
                    ? 'bg-primary-light text-primary'
                    : 'bg-primary text-white'
                }`}
              >
                {subscription.isTrial ? 'Bepul' : 'Faol'}
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${((subscription.totalDays - subscription.daysLeft) / subscription.totalDays) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{subscription.daysLeft} kun qoldi</span>
              <span>{format(subscription.nextPaymentDate, 'd MMM yyyy', { locale: uz })}</span>
            </div>

            {!subscription.isTrial && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Keyingi to'lov: <span className="font-medium text-gray-900 dark:text-gray-100">{monthlyPrice.toLocaleString('uz-UZ')} so'm</span>
              </p>
            )}
          </div>
        )}

        {/* Payment */}
        {paymentSettings?.card_number && (
          <div className="card p-5 bg-primary text-white">
            <h2 className="font-semibold mb-2">Tizim to'lovi uchun rekvizitlar</h2>
            <p className="text-sm opacity-90 mb-4">
              Quyidagi karta raqamiga to'lov qiling va chek skrinshotini yuklang.
            </p>
            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/20">
              <p className="text-xs opacity-80 uppercase tracking-wider mb-1">Karta raqami</p>
              <p className="text-xl tracking-[0.2em] font-mono">{paymentSettings.card_number}</p>
              <p className="text-sm mt-1">{paymentSettings.card_holder}</p>
              {paymentSettings.bank_name && (
                <p className="text-xs opacity-80 mt-0.5">{paymentSettings.bank_name}</p>
              )}
            </div>
          </div>
        )}

        <div className="card p-4">
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">To'lovni tasdiqlash</h2>
          <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">To'langan summa</label>
              <input
                type="number"
                className="input-field"
                placeholder="Misol uchun: 100000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Chek skrinshoti</label>
              {receiptImage ? (
                <div className="relative h-40 rounded-xl overflow-hidden bg-gray-100">
                  <img src={receiptImage} alt="Chek" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setReceiptImage('')}
                    className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm"
                  >
                    X
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {uploading ? 'Yuklanmoqda...' : 'Rasm tanlash'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePaymentFile} disabled={uploading} />
                </label>
              )}
            </div>

            {paymentError && <p className="text-red-500 text-sm">{paymentError}</p>}

            <button type="submit" disabled={saving || uploading} className="btn-primary mt-2">
              {saving ? 'Yuborilmoqda...' : 'Yuborish'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">To'lovlar tarixi</h2>
          {paymentsLoading ? (
            <div className="text-center text-sm text-gray-500">Yuklanmoqda...</div>
          ) : payments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {payments.map(p => (
                <div key={p.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{p.amount} so'm</p>
                    <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    {p.status === 'pending' && <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Kutilmoqda</span>}
                    {p.status === 'approved' && <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Tasdiqlandi</span>}
                    {p.status === 'rejected' && <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Rad etildi</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-gray-500 text-sm">
              Sizda hali to'lovlar yo'q.
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className="card divide-y divide-gray-100 dark:divide-gray-700">
          <ToggleRow
            label="Bildirishnomalar"
            sub="Push xabarlarni qabul qilish"
            checked={notificationsEnabled}
            onChange={toggleNotifications}
          />
          <ToggleRow
            label="Tungi rejim"
            sub="Ilova ko'rinishi"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
        </div>

        <button
          onClick={logout}
          className="w-full bg-red-500 text-white font-semibold py-3.5 rounded-btn active:opacity-90 transition-opacity"
        >
          Chiqish
        </button>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string
  sub: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{sub}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
