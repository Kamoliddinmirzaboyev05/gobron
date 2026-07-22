import { useState, FormEvent, useRef } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { createField, updateField } from '../api/fields'
import { uploadImage } from '../api/media'
import type { Field } from '../types'
import { extractDigits, formatThousands } from '../utils/number'

/** "20x30" -> ["20", "30"]; anything else parses to blanks. */
function parseSize(size: string | undefined): [string, string] {
  const match = size?.match(/^(\d+)\s*x\s*(\d+)$/i)
  return match ? [match[1], match[2]] : ['', '']
}

export default function FieldFormPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const existingField = location.state?.field as Field | undefined
  const isEditing = !!existingField
  const [initialLength, initialWidth] = parseSize(existingField?.size)

  const [name, setName] = useState(existingField?.name ?? '')
  const [length, setLength] = useState(initialLength)
  const [width, setWidth] = useState(initialWidth)
  const [price, setPrice] = useState(existingField?.pricePerHour?.toString() ?? '')
  const [images, setImages] = useState<string[]>(existingField?.images ?? [])
  const [pendingUploads, setPendingUploads] = useState<{ id: string; progress: number }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [surfaceType, setSurfaceType] = useState<'open' | 'covered'>(existingField?.surfaceType ?? 'open')
  const [isActive, setIsActive] = useState(existingField?.isActive ?? true)
  const [bookingWindowDays, setBookingWindowDays] = useState(
    existingField?.bookingWindowDays?.toString() ?? '3'
  )
  const [latitude, setLatitude] = useState<number | undefined>(existingField?.latitude)
  const [longitude, setLongitude] = useState<number | undefined>(existingField?.longitude)
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function detectLocation() {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, location: "Brauzer joylashuvni aniqlay olmaydi" }))
      return
    }
    setLocating(true)
    setErrors((prev) => { const e = { ...prev }; delete e.location; return e })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setLocating(false)
      },
      () => {
        setErrors((prev) => ({ ...prev, location: "Joylashuvni aniqlab bo'lmadi. Ruxsat bering." }))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function openInMaps() {
    if (latitude == null || longitude == null) return
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank')
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    const entries = files.map((file) => ({ id: `${Date.now()}-${Math.random()}`, file }))
    setPendingUploads((prev) => [...prev, ...entries.map(({ id }) => ({ id, progress: 0 }))])

    await Promise.all(
      entries.map(async ({ id, file }) => {
        try {
          const url = await uploadImage(file, (percent) => {
            setPendingUploads((prev) => prev.map((p) => (p.id === id ? { ...p, progress: percent } : p)))
          })
          setImages((prev) => [...prev, url])
        } catch {
          setErrors((prev) => ({ ...prev, images: "Rasmni yuklab bo'lmadi. Qayta urinib ko'ring." }))
        } finally {
          setPendingUploads((prev) => prev.filter((p) => p.id !== id))
        }
      })
    )
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Nomini kiriting'
    if (!price.trim()) e.price = 'Narxini kiriting'
    else if (isNaN(Number(price))) e.price = 'Raqam kiriting'
    if (!bookingWindowDays.trim() || Number(bookingWindowDays) < 1) e.bookingWindowDays = 'Kamida 1 kun'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const field: Omit<Field, 'id' | 'venueId'> = {
      name: name.trim(),
      size: length.trim() && width.trim() ? `${length.trim()}x${width.trim()}` : undefined,
      pricePerHour: Number(price),
      surfaceType,
      images,
      peakPriceMultiplier: existingField?.peakPriceMultiplier ?? 1.0,
      isActive,
      bookingWindowDays: Number(bookingWindowDays),
      latitude,
      longitude,
    }

    setSaving(true)
    try {
      if (isEditing && id) {
        await updateField(id, field)
      } else {
        await createField(field)
      }
      navigate(-1)
    } catch {
      setErrors({ submit: "Xatolik yuz berdi. Qayta urinib ko'ring." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-scaffold dark:bg-gray-900">
      {/* AppBar */}
      <div className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600 dark:text-gray-300">
          <BackIcon />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {isEditing ? 'Maydonni tahrirlash' : 'Yangi maydon'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="p-4 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Maydon nomi</label>
            <input
              className="input-field"
              placeholder="Maydon 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bo'yi (m)</label>
              <input
                className="input-field"
                type="number"
                inputMode="numeric"
                placeholder="20"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Eni (m)</label>
              <input
                className="input-field"
                type="number"
                inputMode="numeric"
                placeholder="30"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {"Narxi (1 soat uchun, so'm)"}
            </label>
            <input
              className="input-field"
              type="text"
              inputMode="numeric"
              placeholder="100 000"
              value={formatThousands(price)}
              onChange={(e) => setPrice(extractDigits(e.target.value))}
            />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>

          {/* Booking window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Necha kun oldindan qo'lda band qilish mumkin
            </label>
            <input
              className="input-field"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="3"
              value={bookingWindowDays}
              onChange={(e) => setBookingWindowDays(e.target.value)}
            />
            {errors.bookingWindowDays && (
              <p className="text-red-500 text-xs mt-1">{errors.bookingWindowDays}</p>
            )}
          </div>

          {/* Surface type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maydon turi</label>
            <div className="grid grid-cols-2 gap-2">
              {(['open', 'covered'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSurfaceType(type)}
                  className={`py-2.5 rounded-btn text-sm font-medium border-2 transition-colors ${
                    surfaceType === type
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {type === 'open' ? 'Ochiq' : 'Yopiq'}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rasmlar</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-btn overflow-hidden border border-gray-200 dark:border-gray-600">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-5"
                  >
                    ×
                  </button>
                </div>
              ))}
              {pendingUploads.map(({ id, progress }) => (
                <div
                  key={id}
                  className="relative w-20 h-20 rounded-btn overflow-hidden border border-gray-200 dark:border-gray-600"
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: `conic-gradient(#17A548 ${progress * 3.6}deg, #e5e7eb 0deg)` }}
                  />
                  <div className="absolute inset-1 rounded-btn bg-white dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{progress}%</span>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pendingUploads.length > 0}
                className="w-20 h-20 rounded-btn border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 text-2xl"
              >
                +
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleFilesSelected}
            />
            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Joylashuv</label>

            {latitude != null && longitude != null ? (
              <div className="card p-3 flex items-center justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Koordinatalar</p>
                  <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
                    {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openInMaps}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-btn bg-primary-light text-primary text-sm font-medium"
                >
                  <MapPinIcon />
                  Google Maps
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">Joylashuv aniqlanmagan</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-btn border-2 border-primary text-primary text-sm font-medium disabled:opacity-50"
              >
                {locating ? <SmallSpinner /> : <LocateIcon />}
                {locating ? 'Aniqlanmoqda...' : 'Joylashuvni aniqlash'}
              </button>
              {latitude != null && (
                <button
                  type="button"
                  onClick={() => { setLatitude(undefined); setLongitude(undefined) }}
                  className="px-3 py-2.5 rounded-btn border-2 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm"
                >
                  O'chirish
                </button>
              )}
            </div>
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Faol</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Maydon band qilinishi mumkin</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {errors.submit && (
            <p className="text-red-500 text-sm text-center">{errors.submit}</p>
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

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SmallSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function LocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
