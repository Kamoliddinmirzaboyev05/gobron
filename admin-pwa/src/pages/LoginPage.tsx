import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { loginWithPhone } from '../api/auth'
import { useAuthStore } from '../store/auth'
import PhoneInput from '../components/PhoneInput'
import { SoccerIcon, Spinner } from '../components/BrandIcons'
import { PHONE_DIGITS_LENGTH, toE164 } from '../utils/phone'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [phoneDigits, setPhoneDigits] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (phoneDigits.length < PHONE_DIGITS_LENGTH) {
      setError('Telefon raqamini to\'liq kiriting')
      return
    }
    if (!password) {
      setError('Parolni kiriting')
      return
    }
    setError('')
    setLoading(true)
    try {
      await loginWithPhone(toE164(phoneDigits), password)
      login()
      navigate('/home', { replace: true })
    } catch (err) {
      const status = (err as AxiosError).response?.status
      setError(status === 401 ? 'Raqam yoki parol noto\'g\'ri' : 'Kirish amalga oshmadi')
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
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">Kirish uchun telefon raqam va parolingizni kiriting</p>
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
              Parol
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="Parolingiz"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Hisobingiz yo'qmi?{' '}
            <Link to="/register" className="text-primary font-medium">
              Ro'yxatdan o'tish
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
