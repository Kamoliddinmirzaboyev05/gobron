/**
 * Parse Humo (and similar bank) notification text into a clean integer amount.
 *
 * Handles common formats:
 *   "50 014 so'm", "50014 UZS", "+50,014.00", "Summa: 50014"
 */
export interface ParsedPayment {
  /** Integer so'm (no tiyin). */
  amount: number;
  /** Optional ISO-ish time fragment if present in the message. */
  timeHint: string | null;
  /** Raw cleaned digit string before Number(). */
  rawAmountToken: string;
}

/** Collapse spaces/NBSP, strip currency labels, keep digits. */
function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Candidate amount patterns ordered from most specific to loosest.
 * Groups capture the amount token (with spaces/commas allowed).
 */
const AMOUNT_PATTERNS: RegExp[] = [
  // Prefer amount + currency (most reliable; avoids matching dates after "o'tkazildi")
  /([+\-]?\d[\d\s.,]*)\s*(?:so['']?m|uzs|сум|sum)\b/i,
  // HUMOcardbot / bank labels (UZ + RU)
  /(?:summa|miqdor|amount|to['']?lov|пополнение|приход|зачислено|перевод|баланс)[:\s]+([+\-]?\d[\d\s.,]*)/i,
  // "+50 014" credit style often used by card bots
  /(?:^|\s)\+([0-9][\d\s.,]*)/,
  // Fallback: thousand-grouped number only (not bare 12.07.2026)
  /(\d{1,3}(?:[\s,]\d{3}){1,})/,
];

const TIME_PATTERN =
  /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})?[,\s]*(\d{1,2}:\d{2}(?::\d{2})?)/;

/**
 * Convert a messy amount token ("50 014", "50,014.00", "+50014") into integer so'm.
 * Fractional tiyin/cents are truncated (Humo P2P is whole so'm for our matcher).
 */
export function toIntegerSom(token: string): number | null {
  let t = token.replace(/\s+/g, "").replace(/^\+/, "").replace(/^-/, "");

  // Normalize thousand separators + drop fractional tiyin/cents.
  // US: 50,014.00  EU: 50.014,00  plain: 50014
  if (/,/.test(t) && /\./.test(t)) {
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) {
      // EU: dots = thousands, comma = decimal
      t = t.replace(/\./g, "").replace(",", ".");
    } else {
      // US: commas = thousands, dot = decimal
      t = t.replace(/,/g, "");
    }
  } else if (/,/.test(t)) {
    const parts = t.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      t = parts[0]; // "50014,00"
    } else {
      t = t.replace(/,/g, ""); // "50,014"
    }
  }

  // Drop decimal part if still present ("50014.00")
  if (/\./.test(t)) {
    const parts = t.split(".");
    if (parts.length === 2 && parts[1].length <= 2) {
      t = parts[0];
    } else {
      // "50.014" european thousands without cents
      t = t.replace(/\./g, "");
    }
  }

  t = t.replace(/[^\d]/g, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

/**
 * Extract amount (+ optional time hint) from a Humo bot message.
 * Returns null if no reliable amount is found — caller must not crash.
 */
export function parsePaymentMessage(raw: string): ParsedPayment | null {
  if (!raw || !raw.trim()) return null;
  const text = normalizeText(raw);

  let rawToken: string | null = null;
  for (const re of AMOUNT_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      rawToken = m[1].trim();
      break;
    }
  }
  if (!rawToken) return null;

  const amount = toIntegerSom(rawToken);
  if (amount === null) return null;

  const tm = text.match(TIME_PATTERN);
  const timeHint = tm ? [tm[1], tm[2]].filter(Boolean).join(" ").trim() || null : null;

  return { amount, timeHint, rawAmountToken: rawToken };
}
