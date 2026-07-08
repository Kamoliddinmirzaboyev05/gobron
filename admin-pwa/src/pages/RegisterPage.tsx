import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { registerWithPhone } from '../api/auth'
import { useAuthStore } from '../store/auth'
import PhoneInput from '../components/PhoneInput'
import { SoccerIcon, Spinner } from '../components/BrandIcons'
import { PHONE_DIGITS_LENGTH, toE164 } from '../utils/phone'

const MIN_PASSWORD_LENGTH = 6

export default function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [phoneDigits, setPhoneDigits] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (phoneDigits.length < PHONE_DIGITS_LENGTH) {
      setError('Telefon raqamini to\'liq kiriting')
      return
    }
    if (!fullName.trim()) {
      setError('To\'liq ismingizni kiriting')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Parol kamida ${MIN_PASSWORD_LENGTH} ta belgidan iborat bo'lishi kerak`)
      return
    }
    if (password !== confirmPassword) {
      setError('Parollar mos kelmadi')
      return
    }
    setError('')
    setLoading(true)
    try {
      await registerWithPhone(toE164(phoneDigits), fullName.trim(), password)
      login()
      navigate('/home', { replace: true })
    } catch (err) {
      const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail
      setError(detail ?? 'Ro\'yxatdan o\'tish amalga oshmadi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-scaffold dark:bg-gray-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center mb-6">
            <SoccerIcon size={72} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gobron — Maydon egasi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">Ro'yxatdan o'tish uchun ma'lumotlaringizni kiriting</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Telefon raqam
            </label>
            <PhoneInput digits={phoneDigits} onChange={setPhoneDigits} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              To'liq ism
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Parol
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="Kamida 6 ta belgi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Parolni takrorlang
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="Parolni qayta kiriting"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
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
                Ro'yxatdan o'tish...
              </span>
            ) : (
              'Ro\'yxatdan o\'tish'
            )}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Hisobingiz bormi?{' '}
            <Link to="/" className="text-primary font-medium">
              Kirish
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
