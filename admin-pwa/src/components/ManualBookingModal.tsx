import { useState, useEffect, FormEvent } from 'react'
import type { Field, ManualBookingInput } from '../types'

interface Props {
  fields: Field[]
  onConfirm: (input: ManualBookingInput) => Promise<void>
  onClose: () => void
}

export default function ManualBookingModal({ fields, onConfirm, onClose }: Props) {
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? '')
  const [date, setDate] = useState(todayString())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedField = fields.find((f) => f.id === fieldId)

  // Auto-fill price when field changes
  useEffect(() => {
    if (selectedField) {
      setPrice(selectedField.pricePerHour.toString())
    }
  }, [fieldId, selectedField])

  function validate(): boolean {
    if (!fieldId) { setError('Maydonni tanlang'); return false }
    if (!date) { setError('Sanani tanlang'); return false }
    if (startTime >= endTime) { setError("Boshlanish vaqti tugash vaqtidan kichik bo'lishi kerak"); return false }
    if (!customerName.trim()) { setError('Mijoz ismini kiriting'); return false }
    if (!customerPhone.trim()) { setError('Telefon raqamni kiriting'); return false }
    if (!price || isNaN(Number(price))) { setError('Narxni kiriting'); return false }
    setError('')
    return true
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onConfirm({
        fieldId,
        date,
        startTime,
        endTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        price: Number(price),
        note: note.trim() || undefined,
      })
    } catch {
      setError('Xatolik yuz berdi')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl max-h-[90dvh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-2 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold">Band qilish</h2>
          <button onClick={onClose} className="p-1 text-gray-400">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex flex-col gap-4 p-4 pb-8">
          {/* Field select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Maydon</label>
            <select
              className="input-field"
              value={fieldId}
              onChange={(e) => setFieldId(e.target.value)}
            >
              {fields.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sana</label>
            <input
              type="date"
              className="input-field"
              value={date}
              min={todayString()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Boshlanish</label>
              <input
                type="time"
                className="input-field"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tugash</label>
              <input
                type="time"
                className="input-field"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Customer name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mijoz ismi</label>
            <input
              className="input-field"
              placeholder="Ism Familiya"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Customer phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
            <input
              type="tel"
              className="input-field"
              placeholder="+998901234567"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{"Narx (so'm)"}</label>
            <input
              type="number"
              inputMode="numeric"
              className="input-field"
              placeholder="100000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Izoh (ixtiyoriy)</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Qo'shimcha ma'lumot..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <SmallSpinner />
                Saqlanmoqda...
              </span>
            ) : (
              'Tasdiqlash'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SmallSpinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
