/** Keys must match app/utils/amenities.py on the backend. */
const LABELS: Record<string, string> = {
  parking: "Parkovka",
  shower: "Dush",
  changing_room: "Kiyim almashtirish xonasi",
  lighting: "Yoritish",
  wc: "Hojatxona",
  cafe: "Kafe",
  wifi: "Wi-Fi",
  tribune: "Tribuna",
  ball_rental: "To'p ijarasi",
  first_aid: "Tibbiy yordam",
};

/** Unknown keys (a newer backend) fall back to the raw key rather than vanish. */
export function amenityLabel(key: string): string {
  return LABELS[key] ?? key;
}
