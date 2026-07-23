/**
 * Env-backed configuration for the Payment Matcher service.
 * All secrets live in `.env` — never hard-code them.
 */
import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v.trim();
}

function optional(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export const config = {
  databaseUrl: required("DATABASE_URL"),

  telegram: {
    apiId: Number(required("TELEGRAM_API_ID")),
    apiHash: required("TELEGRAM_API_HASH"),
    /** Empty → interactive login on first run. */
    session: optional("TELEGRAM_SESSION"),
    phone: optional("TELEGRAM_PHONE"),
  },

  /** Primary Humo bot + optional extras (without @). */
  humoBots: [
    optional("HUMO_BOT_USERNAME", "humo_uz"),
    ...optional("HUMO_BOT_EXTRA")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ].map((u) => u.replace(/^@/, "").toLowerCase()),

  paymentTtlMinutes: Number(optional("PAYMENT_TTL_MINUTES", "15")),
  logLevel: optional("LOG_LEVEL", "info") as "debug" | "info" | "warn" | "error",
};

if (!Number.isFinite(config.telegram.apiId) || config.telegram.apiId <= 0) {
  throw new Error("TELEGRAM_API_ID must be a positive number");
}
