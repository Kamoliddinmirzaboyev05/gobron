import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchVenue, updateVenue } from '../api/venue'
import { fetchFields } from '../api/fields'
import { fetchMe, OwnerProfile } from '../api/auth'
import type { Venue, Field } from '../types'
import { WEEKDAY_LABELS } from '../types'
import { useLoad } from '../hooks/useLoad'
import { VenueSettingsSkeleton } from '../components/Skeleton'
import { getSubscriptionStatus } from '../utils/subscription'
import FieldCard from '../components/FieldCard'

export default function VenueSettingsPage() {
  const navigate = useNavigate()
  const { data: venue, loading } = useLoad<Venue>(() => fetchVenue(), [])
  const { data: profile } = useLoad<OwnerProfile>(() => fetchMe(), [])
  const { data: fields } = useLoad<Field[]>(() => fetchFields(), [])
  const monthlyPrice = fields?.[0]?.pricePerHour ?? 0
  const subscription = profile ? getSubscriptionStatus(profile.createdAt) : null

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [openingTime, setOpeningTime] = useState('08:00')
  const [closingTime, setClosingTime] = useState('23:00')
  const [workingDays, setWorkingDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (venue) {
      setName(venue.name)
      setAddress(venue.address)
      setLandmark(venue.landmark ?? '')
      setOpeningTime(venue.openingTime)
      setClosingTime(venue.closingTime)
      setWorkingDays(venue.workingDays)
      setIsActive(venue.isActive)
    }
  }, [venue])

  function toggleDay(day: number) {
    setWorkingDays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess(false)
    setSaving(true)
    try {
      await updateVenue({
        name,
        address,
        landmark: landmark || undefined,
        openingTime,
        closingTime,
        workingDays,
        isActive,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError("Xatolik yuz berdi. Qayta urinib ko'ring.")
    } finally {
      setSaving(false)
    }
  }

  if (loading && !venue) {
    return (
      <div className="flex flex-col min-h-full bg-scaffold">
        <div className="bg-white px-4 py-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Sozlamalar</h1>
        </div>
        <VenueSettingsSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-scaffold">
      {/* AppBar */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Sozlamalar</h1>
      </div>

      <div className="p-4 pb-0 flex flex-col gap-4">
        {/* Owner name */}
        {profile && (
          <div className="card px-4 py-3">
            <p className="text-sm text-gray-500">Egasi</p>
            <p className="font-medium text-gray-900">{profile.fullName || '—'}</p>
          </div>
        )}

        {/* Subscription */}
        {subscription && (
          <div className="card px-4 py-3">
            <p className="font-medium text-gray-900">
              {subscription.isTrial ? "Bepul sinov davri" : 'Oylik obuna'}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {subscription.daysLeft} kun qoldi
            </p>
            {!subscription.isTrial && (
              <p className="text-sm text-gray-500 mt-0.5">
                Keyingi to'lov: {monthlyPrice.toLocaleString('uz-UZ')} so'm
              </p>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="p-4 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Maydoncha nomi</label>
            <input
              className="input-field"
              placeholder="Gobron Sport"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Manzil</label>
            <input
              className="input-field"
              placeholder="Toshkent, Chilonzor..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mo'ljal</label>
            <input
              className="input-field"
              placeholder="Do&#x2018;kondan o&#x2018;ngga..."
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ochilish vaqti</label>
              <input
                type="time"
                className="input-field"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Yopilish vaqti</label>
              <input
                type="time"
                className="input-field"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
              />
            </div>
          </div>

          {/* Working days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ish kunlari</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                    workingDays.includes(idx)
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Maydonlar</label>
              <button
                type="button"
                onClick={() => navigate('/fields/new')}
                className="text-primary text-sm font-medium"
              >
                + Qo'shish
              </button>
            </div>
            {fields && fields.length > 0 ? (
              <div className="flex flex-col gap-3">
                {fields.map((field) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    onEdit={() => navigate(`/fields/edit/${field.id}`, { state: { field } })}
                  />
                ))}
              </div>
            ) : (
              <div className="card p-6 text-center text-gray-400 text-sm">
                Hozircha maydon yo'q
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="card px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Faol holat</p>
              <p className="text-sm text-gray-500">Maydoncha band qilishga ochiq</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isActive ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {saveError && <p className="text-red-500 text-sm text-center">{saveError}</p>}
          {saveSuccess && (
            <p className="text-primary text-sm text-center font-medium">✓ Muvaffaqiyatli saqlandi</p>
          )}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <SmallSpinner />
                Saqlanmoqda...
              </span>
            ) : (
              'Saqlash'
            )}
          </button>
        </div>
      </form>
    </div>
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
