import { useState, useEffect, FormEvent } from 'react'
import { fetchVenue, updateVenue } from '../api/venue'
import { fetchFields } from '../api/fields'
import type { Venue, Field } from '../types'
import { WEEKDAY_LABELS } from '../types'
import { useLoad } from '../hooks/useLoad'
import TopBar from '../components/TopBar'
import AccordionFieldForm from '../components/AccordionFieldForm'

export default function FieldsListPage() {
  const { data: venue, loading: venueLoading } = useLoad<Venue>(() => fetchVenue(), [])
  const [fields, setFields] = useState<Field[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)

  async function loadFields() {
    setFieldsLoading(true)
    try {
      const data = await fetchFields()
      setFields(data)
    } catch (e) {
      console.error(e)
    } finally {
      setFieldsLoading(false)
    }
  }

  useEffect(() => {
    loadFields()
  }, [])

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Maydonlar" />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {!venueLoading && venue && <VenueSettingsCard venue={venue} />}

        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Maydonlar ro'yxati</h2>
          {!showNewForm && (
            <button 
              onClick={() => setShowNewForm(true)}
              className="text-primary font-medium text-sm flex items-center gap-1"
            >
              + Yangi qo'shish
            </button>
          )}
        </div>

        {showNewForm && (
          <AccordionFieldForm 
            isNew 
            onSaved={() => {
              setShowNewForm(false)
              loadFields()
            }}
            onCancel={() => setShowNewForm(false)}
          />
        )}

        {fieldsLoading && fields.length === 0 ? (
          <div className="card p-6 text-center text-gray-400 dark:text-gray-500 text-sm">Yuklanmoqda...</div>
        ) : fields.length > 0 ? (
          <div className="flex flex-col gap-3">
            {fields.map((f) => (
              <AccordionFieldForm 
                key={f.id} 
                field={f} 
                onSaved={loadFields} 
              />
            ))}
          </div>
        ) : !showNewForm ? (
          <div className="card p-8 text-center text-gray-400 dark:text-gray-500">
            <p>Hozircha maydon qo'shilmagan</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function VenueSettingsCard({ venue }: { venue: Venue }) {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState(venue.name)
  const [address, setAddress] = useState(venue.address)
  const [landmark, setLandmark] = useState(venue.landmark ?? '')
  const [openingTime, setOpeningTime] = useState(venue.openingTime)
  const [closingTime, setClosingTime] = useState(venue.closingTime)
  const [workingDays, setWorkingDays] = useState<number[]>(venue.workingDays)
  const [isActive, setIsActive] = useState(venue.isActive)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    setName(venue.name)
    setAddress(venue.address)
    setLandmark(venue.landmark ?? '')
    setOpeningTime(venue.openingTime)
    setClosingTime(venue.closingTime)
    setWorkingDays(venue.workingDays)
    setIsActive(venue.isActive)
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

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="text-left">
          <p className="font-medium text-gray-900 dark:text-gray-100">{venue.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{venue.address}</p>
        </div>
        <ChevronIcon down={expanded} />
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Maydoncha nomi</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Manzil</label>
            <input className="input-field" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mo'ljal</label>
            <input className="input-field" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ochilish vaqti</label>
              <input type="time" className="input-field" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Yopilish vaqti</label>
              <input type="time" className="input-field" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ish kunlari</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                    workingDays.includes(idx)
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Faol holat</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Maydoncha band qilishga ochiq</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {saveError && <p className="text-red-500 text-sm text-center">{saveError}</p>}
          {saveSuccess && <p className="text-primary text-sm text-center font-medium">✓ Muvaffaqiyatli saqlandi</p>}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </form>
      )}
    </div>
  )
}

function ChevronIcon({ down }: { down: boolean }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      className={`text-gray-400 dark:text-gray-500 transition-transform ${down ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
