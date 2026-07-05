// Small pure helpers — native Intl/Date, no date library needed.

const UZS = new Intl.NumberFormat("uz-UZ");

/** "150000" -> "150 000 so'm" */
export function formatPrice(v: number): string {
  return `${UZS.format(Math.round(v))} so'm`;
}

/** "18:30:00" -> "18:30" */
export function shortTime(t: string): string {
  return t.slice(0, 5);
}

const WEEKDAYS_UZ = ["Yak", "Du", "Se", "Chor", "Pay", "Jum", "Sha"];
const MONTHS_UZ = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyun",
  "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek",
];

/** ISO date string (YYYY-MM-DD) for a Date, in local time. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export interface DayOption {
  iso: string;
  weekday: string; // Uzbek short weekday (Sun-indexed getDay)
  label: string; // "12 Iyul"
  isToday: boolean;
}

/** The next `count` days starting today, for the horizontal date picker. */
export function nextDays(count: number): DayOption[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      iso: isoDate(d),
      weekday: WEEKDAYS_UZ[d.getDay()],
      label: `${d.getDate()} ${MONTHS_UZ[d.getMonth()]}`,
      isToday: i === 0,
    };
  });
}
