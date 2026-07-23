/**
 * Interactive-ish Telegram session login for payment-matcher.
 *
 * 1) API id/hash/phone/2FA from .env (or payment_settings if DB up)
 * 2) Phone code: write 5-digit code into payment-matcher/.telegram_code
 *    OR set TELEGRAM_LOGIN_CODE env before start
 * 3) Session printed + written to .env TELEGRAM_SESSION + DB if available
 *
 * Usage: npm run login
 */
import { readFile, writeFile, unlink, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { config, loadEnvConfig } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { loadMatcherSettingsFromDb, saveSessionToDb } from "./services/settingsLoader.js";
import { pool } from "./db/pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CODE_FILE = path.join(ROOT, ".telegram_code");
const ENV_FILE = path.join(ROOT, ".env");

async function waitForPhoneCode(timeoutMs = 5 * 60_000): Promise<string> {
  const fromEnv = (process.env.TELEGRAM_LOGIN_CODE ?? "").trim();
  if (fromEnv) {
    logger.info("using TELEGRAM_LOGIN_CODE from env");
    return fromEnv;
  }

  logger.info("Telegram kod kutilmoqda…", {
    hint: `Kodni shu faylga yozing: ${CODE_FILE}`,
    or: "yoki chatda menga yuboring",
  });

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await access(CODE_FILE);
      const raw = (await readFile(CODE_FILE, "utf8")).trim().replace(/\s/g, "");
      if (raw.length >= 5) {
        await unlink(CODE_FILE).catch(() => undefined);
        logger.info("kod o'qildi (.telegram_code)");
        return raw;
      }
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Telegram login kodi 5 daqiqada kelmadi (.telegram_code)");
}

async function upsertEnvSession(session: string): Promise<void> {
  let text = "";
  try {
    text = await readFile(ENV_FILE, "utf8");
  } catch {
    text = "";
  }
  if (/^TELEGRAM_SESSION=/m.test(text)) {
    text = text.replace(/^TELEGRAM_SESSION=.*$/m, `TELEGRAM_SESSION=${session}`);
  } else {
    text = text.trimEnd() + `\nTELEGRAM_SESSION=${session}\n`;
  }
  await writeFile(ENV_FILE, text, "utf8");
  logger.info("TELEGRAM_SESSION .env ga yozildi");
}

async function main(): Promise<void> {
  // DB optional
  try {
    await pool.query("SELECT 1");
    await loadMatcherSettingsFromDb();
  } catch (err) {
    Object.assign(config, loadEnvConfig());
    logger.warn("DB yo'q — faqat .env ishlatiladi", { err: String(err) });
  }

  if (!config.telegram.apiId || !config.telegram.apiHash) {
    throw new Error("TELEGRAM_API_ID / TELEGRAM_API_HASH kerak (.env yoki Superadmin)");
  }
  if (!config.telegram.phone) {
    throw new Error("TELEGRAM_PHONE kerak — Superadmin yoki .env da +998… raqam");
  }

  logger.info("login boshlanmoqda", {
    apiId: config.telegram.apiId,
    phone: "***" + config.telegram.phone.slice(-4),
    has2fa: Boolean(config.telegram.twoFaPassword),
    hasSession: Boolean(config.telegram.session),
  });

  if (config.telegram.session) {
    logger.info("Session allaqachon bor. Qayta login uchun TELEGRAM_SESSION ni bo'shating.");
  }

  const client = new TelegramClient(
    new StringSession(config.telegram.session || ""),
    config.telegram.apiId,
    config.telegram.apiHash,
    { connectionRetries: 5, useWSS: false },
  );

  await client.start({
    phoneNumber: async () => config.telegram.phone,
    password: async () => {
      if (config.telegram.twoFaPassword) {
        logger.info("2FA parol .env/DB dan");
        return config.telegram.twoFaPassword;
      }
      throw new Error(
        "2FA yoqilgan. Superadmin da cloud password yoki TELEGRAM_2FA_PASSWORD ni to'ldiring.",
      );
    },
    phoneCode: () => waitForPhoneCode(),
    onError: (err) => {
      logger.error("telegram error", { err: String(err) });
      // FloodWait / AUTH errors — do not spin forever
      const msg = String(err);
      if (msg.includes("FloodWait") || msg.includes("PHONE_") || msg.includes("API_ID")) {
        throw err instanceof Error ? err : new Error(msg);
      }
      return true; // other errors: let GramJS decide
    },
  });

  const sessionStr = client.session.save() as unknown as string;
  if (!sessionStr) throw new Error("Session bo'sh qaytdi");

  config.telegram.session = sessionStr;
  await upsertEnvSession(sessionStr);
  try {
    await saveSessionToDb(sessionStr);
  } catch {
    /* ok */
  }

  logger.info("LOGIN OK — session saqlandi. Endi: npm run dev");
  await client.disconnect();
  try {
    await pool.end();
  } catch {
    /* ok */
  }
}

main().catch(async (err) => {
  logger.error("login failed", { err: String(err) });
  try {
    await pool.end();
  } catch {
    /* ok */
  }
  process.exit(1);
});
