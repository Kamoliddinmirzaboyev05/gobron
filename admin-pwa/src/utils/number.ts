/** Strips everything but digits, e.g. for parsing a formatted money input back to a raw number string. */
export function extractDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Formats a digit string with space thousand-separators: "200000" -> "200 000". */
export function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
