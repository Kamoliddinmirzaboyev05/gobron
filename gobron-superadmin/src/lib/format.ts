const UZS = new Intl.NumberFormat("uz-UZ");

export function formatPrice(v: number): string {
  return `${UZS.format(Math.round(v))} so'm`;
}
export function formatNumber(v: number): string {
  return UZS.format(v);
}
export function shortTime(t: string): string {
  return t.slice(0, 5);
}
export function percent(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
