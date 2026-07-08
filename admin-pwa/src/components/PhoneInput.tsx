import { ChangeEvent } from 'react'
import { extractPhoneDigits, formatUzPhone } from '../utils/phone'

interface PhoneInputProps {
  digits: string
  onChange: (digits: string) => void
}

/** Phone field pre-filled with +998, formatted live as "+998 99 999 99 99". */
export default function PhoneInput({ digits, onChange }: PhoneInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(extractPhoneDigits(e.target.value))
  }

  return (
    <input
      type="tel"
      className="input-field"
      placeholder="+998 90 123 45 67"
      value={formatUzPhone(digits)}
      onChange={handleChange}
      autoComplete="tel"
      inputMode="tel"
    />
  )
}
