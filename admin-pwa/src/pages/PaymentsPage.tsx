import { useState, useEffect } from 'react'
import TopBar from '../components/TopBar'
import { uploadImage } from '../api/media'
import { createSubscriptionPayment, fetchSubscriptionPayments, type SubscriptionPayment } from '../api/subscription'

export default function PaymentsPage() {
  const [amount, setAmount] = useState('')
  const [receiptImage, setReceiptImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [payments, setPayments] = useState<SubscriptionPayment[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const data = await fetchSubscriptionPayments()
      setPayments(data)
    } catch {
      console.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadImage(file, () => {})
      setReceiptImage(url)
    } catch {
      setError("Rasmni yuklashda xatolik yuz berdi.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !receiptImage) {
      setError("Summa va chek rasmini kiritish majburiy.")
      return
    }
    setSaving(true)
    setError('')
    try {
      await createSubscriptionPayment(Number(amount), receiptImage)
      setAmount('')
      setReceiptImage('')
      load()
    } catch {
      setError("Xatolik yuz berdi. Qayta urinib ko'ring.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full pb-20">
      <TopBar title="To'lovlar" />

      <div className="p-4 flex flex-col gap-6">
        <div className="card p-5 bg-primary text-white">
          <h2 className="font-semibold mb-2">Tizim to'lovi uchun rekvizitlar</h2>
          <p className="text-sm opacity-90 mb-4">
            Quyidagi karta raqamiga to'lov qiling va chek skrinshotini yuklang.
          </p>
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/20">
            <p className="text-xs opacity-80 uppercase tracking-wider mb-1">Karta raqami</p>
            <p className="text-xl tracking-[0.2em] font-mono">8600 1234 5678 9012</p>
            <p className="text-sm mt-1">Hasanboy To'ychiyev</p>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">To'lovni tasdiqlash</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
                </label>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={saving || uploading} className="btn-primary mt-2">
              {saving ? 'Yuborilmoqda...' : 'Yuborish'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">To'lovlar tarixi</h2>
          {loading ? (
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
      </div>
    </div>
  )
}
