/**
 * Env defaults + optional overrides from payment_settings row (id=1).
 */
import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = (process.env[name] ?? fallback ?? "").trim();
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export type RuntimeConfig = {
  databaseUrl: string;
  telegram: {
    apiId: number;
    apiHash: string;
    session: string;
    phone: string;
    /** Cloud password (2FA). Empty = no 2FA / prompt if needed. */
    twoFaPassword: string;
  };
  humoBots: string[];
  paymentTtlMinutes: number;
  logLevel: "debug" | "info" | "warn" | "error";
};

/** Base from .env — may be incomplete until DB load. */
export function loadEnvConfig(): RuntimeConfig {
  const apiIdRaw = optional("TELEGRAM_API_ID", "0");
  return {
    databaseUrl: required("DATABASE_URL", "postgresql://gobron:gobron@localhost:5432/gobron"),
    telegram: {
      apiId: Number(apiIdRaw) || 0,
      apiHash: optional("TELEGRAM_API_HASH"),
      session: optional("TELEGRAM_SESSION"),
      phone: optional("TELEGRAM_PHONE"),
      twoFaPassword: optional("TELEGRAM_2FA_PASSWORD"),
    },
    humoBots: [
      optional("HUMO_BOT_USERNAME", "HUMOcardbot"),
      ...optional("HUMO_BOT_EXTRA")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ].map((u) => u.replace(/^@/, "").toLowerCase()),
    paymentTtlMinutes: Number(optional("PAYMENT_TTL_MINUTES", "15")),
    logLevel: optional("LOG_LEVEL", "info") as RuntimeConfig["logLevel"],
  };
}

/** Mutable runtime config filled after DB load. */
export let config: RuntimeConfig = loadEnvConfig();

export function applyDbSettings(row: {
  telegram_api_id?: string | null;
  telegram_api_hash?: string | null;
  telegram_phone?: string | null;
  telegram_2fa_password?: string | null;
  telegram_session?: string | null;
  humo_bot_username?: string | null;
}): void {
  const base = loadEnvConfig();
  const apiId = Number(row.telegram_api_id || base.telegram.apiId) || base.telegram.apiId;
  const apiHash = (row.telegram_api_hash || base.telegram.apiHash || "").trim();
  const phone = (row.telegram_phone || base.telegram.phone || "").trim();
  const twoFa = (row.telegram_2fa_password || base.telegram.twoFaPassword || "").trim();
  const session = (row.telegram_session || base.telegram.session || "").trim();
  const bot = (row.humo_bot_username || base.humoBots[0] || "HUMOcardbot")
    .replace(/^@/, "")
    .toLowerCase();

  config = {
    ...base,
    telegram: {
      apiId,
      apiHash,
      phone,
      twoFaPassword: twoFa,
      session,
    },
    humoBots: [bot, ...base.humoBots.filter((b) => b !== bot)],
  };
}
