/**
 * Payment Matcher — load DB settings (incl. 2FA), then start Humo userbot.
 */
import { config } from "./config/index.js";
import { pool } from "./db/pool.js";
import { logger } from "./utils/logger.js";
import { startUserbot } from "./services/telegramUserbot.js";
import { expireStaleIntents } from "./services/orderMatcher.js";
import { loadMatcherSettingsFromDb } from "./services/settingsLoader.js";

const EXPIRE_EVERY_MS = 60_000;

async function main(): Promise<void> {
  logger.info("Payment Matcher starting");

  await pool.query("SELECT 1");
  logger.info("database connected");

  await loadMatcherSettingsFromDb();

  if (!config.telegram.apiId || !config.telegram.apiHash) {
    throw new Error(
      "Telegram API sozlanmagan. Superadmin → Humo to'lovlar → Telegram 2FA bo'limini to'ldiring.",
    );
  }

  const client = await startUserbot();

  const expireTimer = setInterval(() => {
    expireStaleIntents()
      .then((n) => {
        if (n > 0) logger.info("expired pending intents", { count: n });
      })
      .catch((err) => logger.error("expire tick failed", { err: String(err) }));
  }, EXPIRE_EVERY_MS);

  const shutdown = async (signal: string) => {
    logger.info(`shutting down (${signal})`);
    clearInterval(expireTimer);
    try {
      await client.disconnect();
    } catch {
      /* ignore */
    }
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (err) => {
    logger.error("unhandledRejection", { err: String(err) });
  });
}

main().catch((err) => {
  logger.error("fatal startup error", { err: String(err) });
  process.exit(1);
});
