export interface TimeSlot {
  start: string // "HH:MM"
  end: string   // "HH:MM"
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Fixed 1-hour slots between opening/closing time, e.g. "09:00"-"10:00". */
export function generateHourlySlots(openingTime: string, closingTime: string): TimeSlot[] {
  const start = toMinutes(openingTime)
  const end = toMinutes(closingTime)
  const slots: TimeSlot[] = []
  for (let t = start; t + 60 <= end; t += 60) {
    slots.push({ start: toHHMM(t), end: toHHMM(t + 60) })
  }
  return slots
}
