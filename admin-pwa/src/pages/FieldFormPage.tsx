import { useState, FormEvent } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { createField, updateField } from '../api/fields'
import type { Field } from '../types'

export default function FieldFormPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const existingField = location.state?.field as Field | undefined
  const isEditing = !!existingField

  const [name, setName] = useState(existingField?.name ?? '')
  const [size, setSize] = useState(existingField?.size ?? '')
  const [price, setPrice] = useState(existingField?.pricePerHour?.toString() ?? '')
  const [images, setImages] = useState(existingField?.images.join(', ') ?? '')
  const [surfaceType, setSurfaceType] = useState<'open' | 'covered'>(existingField?.surfaceType ?? 'open')
  const [isActive, setIsActive] = useState(existingField?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Nomini kiriting'
    if (!price.trim()) e.price = 'Narxini kiriting'
    else if (isNaN(Number(price))) e.price = 'Raqam kiriting'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const field: Omit<Field, 'id' | 'venueId'> = {
      name: name.trim(),
      size: size.trim() || undefined,
      pricePerHour: Number(price),
      surfaceType,
      images: images
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      peakPriceMultiplier: existingField?.peakPriceMultiplier ?? 1.0,
      isActive,
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
    <div className="flex flex-col min-h-full bg-scaffold">
      {/* AppBar */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600">
          <BackIcon />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {isEditing ? 'Maydonni tahrirlash' : 'Yangi maydon'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="p-4 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Maydon nomi</label>
            <input
              className="input-field"
              placeholder="Maydon 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">O'lchami</label>
            <input
              className="input-field"
              placeholder="20x30"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {"Narxi (1 soat uchun, so'm)"}
            </label>
            <input
              className="input-field"
              type="number"
              inputMode="numeric"
              placeholder="100000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>

          {/* Surface type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maydon turi</label>
            <div className="grid grid-cols-2 gap-2">
              {(['open', 'covered'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSurfaceType(type)}
                  className={`py-2.5 rounded-btn text-sm font-medium border-2 transition-colors ${
                    surfaceType === type
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {type === 'open' ? 'Ochiq' : 'Yopiq'}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rasm URLlari</label>
            <input
              className="input-field"
              placeholder="https://... , https://..."
              value={images}
              onChange={(e) => setImages(e.target.value)}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Faol</p>
              <p className="text-sm text-gray-500">Maydon band qilinishi mumkin</p>
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
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
