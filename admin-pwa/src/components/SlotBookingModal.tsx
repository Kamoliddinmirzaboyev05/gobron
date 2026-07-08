import { useEffect, useMemo, useState, FormEvent } from 'react'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { fetchVenue } from '../api/venue'
import { fetchBookingsByDate, createManualBooking } from '../api/bookings'
import { useLoad } from '../hooks/useLoad'
import { generateHourlySlots } from '../utils/slots'
import type { Field, Venue } from '../types'

interface Props {
  fields: Field[]
  onBooked: () => void
  onClose: () => void
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function currentHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function dayLabel(dateStr: string, today: string): string {
  if (dateStr === today) return 'Bugun'
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Ertaga'
  return format(new Date(dateStr), 'd MMM, EEE', { locale: uz })
}

function formatPhone(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits === '') return ''
  
  if (digits.length > 0 && !digits.startsWith('998')) {
    digits = '998' + digits
  }

  let res = '+998'
  if (digits.length > 3) res += ' ' + digits.substring(3, 5)
  if (digits.length > 5) res += ' ' + digits.substring(5, 8)
  if (digits.length > 8) res += ' ' + digits.substring(8, 10)
  if (digits.length > 10) res += ' ' + digits.substring(10, 12)
  return res
}

export default function SlotBookingModal({ fields, onBooked, onClose }: Props) {
  const today = todayString()
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? '')
  const [date, setDate] = useState(today)
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('+998 ')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: venue } = useLoad<Venue>(() => fetchVenue(), [])
  const field = fields.find((f) => f.id === fieldId)
  const windowDays = field?.bookingWindowDays ?? 3

  const dayOptions = useMemo(() => {
    const base = new Date(today)
    return Array.from({ length: windowDays }, (_, i) => {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }, [today, windowDays])

  // Field's window may have shrunk — keep the selected date valid.
  useEffect(() => {
    if (!dayOptions.includes(date)) setDate(dayOptions[0])
  }, [dayOptions, date])

  const allSlots = useMemo(
    () => {
      const open = field?.openingTime || venue?.openingTime || '08:00'
      const close = field?.closingTime || venue?.closingTime || '23:00'
      return generateHourlySlots(open, close)
    },
    [venue, field]
  )

  const { data: dayBookings } = useLoad(
    () => fetchBookingsByDate(date),
    [date]
  )
  const bookedTimes = useMemo(
    () =>
      new Set(
        (dayBookings ?? [])
          .filter((b) => b.fieldId === fieldId && b.status === 'booked')
          .map((b) => b.startTime)
      ),
    [dayBookings, fieldId]
  )

  useEffect(() => {
    setSelectedSlots(new Set())
  }, [fieldId, date])

  function toggleSlot(start: string) {
    setError('')
    setSelectedSlots((prev) => {
      const isAdding = !prev.has(start)
      const next = new Set(prev)
      if (isAdding) next.add(start)
      else next.delete(start)

      if (next.size <= 1) return next

      const indices = Array.from(next)
        .map((s) => allSlots.findIndex((slot) => slot.start === s))
        .sort((a, b) => a - b)

      const isConsecutive = indices[indices.length - 1] - indices[0] === indices.length - 1

      if (!isConsecutive) {
        if (isAdding) {
          // Start a new selection if picking a non-consecutive slot
          return new Set([start])
        } else {
          // Clear everything if removing a middle slot breaks the consecutive chain
          return new Set()
        }
      }

      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fieldId) { setError('Maydonni tanlang'); return }
    if (selectedSlots.size === 0) { setError('Kamida bitta vaqtni tanlang'); return }
    if (!customerName.trim()) { setError('Mijoz ismini kiriting'); return }
    if (customerPhone.replace(/\D/g, '').length < 12) { setError('Telefon raqamni to\'liq kiriting'); return }
    setError('')
    setSaving(true)
    try {
      await Promise.all(
        Array.from(selectedSlots).map((start) => {
          const slot = allSlots.find((s) => s.start === start)!
          return createManualBooking({
            fieldId,
            date,
            startTime: slot.start,
            endTime: slot.end,
            customerName: customerName.trim(),
            customerPhone: customerPhone.replace(/\s/g, ''),
            price: field?.pricePerHour ?? 0,
          })
        })
      )
      onBooked()
    } catch {
      setError("Ba'zi vaqtlar band bo'lib qoldi. Qayta urinib ko'ring.")
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative bg-white dark:bg-gray-800 rounded-t-3xl max-h-[90dvh] flex flex-col"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        <div className="px-4 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Band qilish</h2>
          <button onClick={onClose} className="p-1 text-gray-400 dark:text-gray-500">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex flex-col gap-4 p-4 pb-8">
          {fields.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Maydon</label>
              <div className="flex flex-wrap gap-2">
                {fields.map((f) => (
                  <Chip key={f.id} active={f.id === fieldId} onClick={() => setFieldId(f.id!)}>
                    {f.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sana</label>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((d) => (
                <Chip key={d} active={d === date} onClick={() => setDate(d)}>
                  {dayLabel(d, today)}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Vaqt</label>
            {allSlots.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Yuklanmoqda...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {allSlots.map((slot) => {
                  const isBooked = bookedTimes.has(slot.start)
                  const isPast = date === today && slot.start < currentHHMM()
                  const disabled = isBooked || isPast
                  if (disabled) return null
                  const isSelected = selectedSlots.has(slot.start)
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleSlot(slot.start)}
                      className={`py-2.5 rounded-btn text-sm font-medium border-2 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : disabled
                          ? 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600 line-through'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {slot.start}-{slot.end}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mijoz ismi</label>
            <input
              className="input-field"
              placeholder="Ism Familiya"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Telefon</label>
            <input
              type="tel"
              className="input-field"
              placeholder="+998 90 123 45 67"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
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
      </motion.div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
        active
          ? 'border-primary bg-primary text-white'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
      }`}
    >
      {children}
    </button>
  )
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
