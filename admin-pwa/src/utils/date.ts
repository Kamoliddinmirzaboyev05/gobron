import { format } from 'date-fns'
import { uz } from 'date-fns/locale'

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

/** "2026-07-09" -> "Bugun" | "Ertaga" | "11-Iyul" */
export function dayLabel(dateStr: string, today: string = todayString()): string {
  if (dateStr === today) return 'Bugun'
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Ertaga'
  return format(new Date(dateStr), 'd-MMMM', { locale: uz })
}
