import { useState, FormEvent, useRef, useEffect } from 'react'
import { updateField, createField } from '../api/fields'
import { uploadImage } from '../api/media'
import type { Field } from '../types'
import { extractDigits, formatThousands } from '../utils/number'

function parseSize(size: string | undefined): [string, string] {
  const match = size?.match(/^(\d+)\s*x\s*(\d+)$/i)
  return match ? [match[1], match[2]] : ['', '']
}

interface Props {
  field?: Field
  onSaved: () => void
  onCancel?: () => void
  isNew?: boolean
}

export default function AccordionFieldForm({ field: existingField, onSaved, onCancel, isNew }: Props) {
  const [expanded, setExpanded] = useState(!!isNew)
  
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
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // reset state if field changes
  useEffect(() => {
    if (existingField && !isNew) {
      const [l, w] = parseSize(existingField.size)
      setName(existingField.name)
      setLength(l)
      setWidth(w)
      setPrice(existingField.pricePerHour?.toString() ?? '')
      setImages(existingField.images || [])
      setSurfaceType(existingField.surfaceType)
      setIsActive(existingField.isActive)
      setBookingWindowDays(existingField.bookingWindowDays?.toString() ?? '3')
    }
  }, [existingField, isNew])

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
    }

    setSaving(true)
    try {
      if (existingField?.id && !isNew) {
        await updateField(existingField.id, field)
      } else {
        await createField(field)
      }
      setExpanded(false)
      onSaved()
    } catch {
      setErrors({ submit: "Xatolik yuz berdi. Qayta urinib ko'ring." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card overflow-hidden mb-3">
      {!isNew ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-start justify-between px-4 py-4 text-left"
        >
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg leading-tight">{existingField?.name}</p>
              {existingField?.isActive ? (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Ochiq</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium">Yopiq</span>
              )}
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{existingField?.size || 'O\'lcham kiritilmagan'}</p>
            
            <p className="text-primary font-semibold text-base">{formatThousands(existingField?.pricePerHour?.toString() ?? '')} so'm<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/soat</span></p>
          </div>
          
          <div className="flex items-center gap-2 pt-1 text-gray-400 dark:text-gray-500">
            <EditIcon />
            <ChevronIcon className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
      ) : (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <p className="font-semibold text-gray-900 dark:text-gray-100">Yangi maydon</p>
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Bekor qilish
            </button>
          )}
        </div>
      )}

      {expanded && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
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

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
            {!isNew && (
              <button type="button" onClick={() => setExpanded(false)} className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-btn">
                Yopish
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
