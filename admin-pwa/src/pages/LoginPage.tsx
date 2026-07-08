import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithPhone } from '../api/auth'
import { useAuthStore } from '../store/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!phone.trim()) {
      setError('Telefon raqamini kiriting')
      return
    }
    setError('')
    setLoading(true)
    try {
      await loginWithPhone(phone.trim(), fullName.trim() || undefined)
      login()
      navigate('/home', { replace: true })
    } catch {
      setError('Kirish amalga oshmadi. Raqamni tekshiring.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-scaffold flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center mb-6">
            <SoccerIcon size={72} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gobron — Maydon egasi</h1>
          <p className="text-gray-500 mt-2 text-center">Telefon raqam orqali kiring</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Telefon raqam
            </label>
            <input
              type="tel"
              className="input-field"
              placeholder="+998901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              To'liq ism <span className="text-gray-400">(ixtiyoriy)</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ism Familiya"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner />
                Kirish...
              </span>
            ) : (
              'Kirish'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function SoccerIcon({ size }: { size: number }) {
  const s = size * 0.6
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="#17A548" strokeWidth="1.5" />
      <path
        d="M12 2C10.5 5 9 7 6.5 8.5M12 2C13.5 5 15 7 17.5 8.5M6.5 8.5C4 10 3 12 3.5 14.5M6.5 8.5C8 10.5 10 11.5 12 11.5M17.5 8.5C20 10 21 12 20.5 14.5M17.5 8.5C16 10.5 14 11.5 12 11.5M12 11.5L10 15.5M12 11.5L14 15.5M3.5 14.5C5 17 7 18.5 10 19.5M3.5 14.5L6.5 16M20.5 14.5C19 17 17 18.5 14 19.5M20.5 14.5L17.5 16M10 19.5C10.5 21 11 21.5 12 22M10 19.5L10 15.5M14 19.5C13.5 21 13 21.5 12 22M14 19.5L14 15.5M10 15.5L6.5 16M14 15.5L17.5 16"
        stroke="#17A548"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
