const PREFIX = '+998'

/** Keeps only the up-to-9 digits that follow the fixed +998 country code. */
export function extractPhoneDigits(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('998')) digits = digits.slice(3)
  return digits.slice(0, 9)
}

/** Renders digits (after 998) as "+998 99 999 99 99". */
export function formatUzPhone(digits: string): string {
  const d = digits.slice(0, 9)
  let out = PREFIX
  if (d.length > 0) out += ' ' + d.slice(0, 2)
  if (d.length > 2) out += ' ' + d.slice(2, 5)
  if (d.length > 5) out += ' ' + d.slice(5, 7)
  if (d.length > 7) out += ' ' + d.slice(7, 9)
  return out
}

/** Digits (after 998) -> E.164 for the API, e.g. "+998901234567". */
export function toE164(digits: string): string {
  return `${PREFIX}${digits}`
}

export const PHONE_DIGITS_LENGTH = 9
