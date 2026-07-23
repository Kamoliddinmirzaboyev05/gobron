/**
 * Payment Matcher Service — entrypoint.
 *
 * Wires: config → DB → Humo userbot listener → parser → order matcher.
 * Also runs a lightweight expire tick so pending intents do not stick forever
 * if the API is idle.
 */
import { config } from "./config/index.js";
import { pool } from "./db/pool.js";
import { logger } from "./utils/logger.js";
import { startUserbot } from "./services/telegramUserbot.js";
import { expireStaleIntents } from "./services/orderMatcher.js";

const EXPIRE_EVERY_MS = 60_000;

async function main(): Promise<void> {
  logger.info("Payment Matcher starting", {
    humoBots: config.humoBots,
    ttlMinutes: config.paymentTtlMinutes,
  });

  // Fail fast if DB is unreachable
  await pool.query("SELECT 1");
  logger.info("database connected");

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

  // Keep process alive; GramJS holds the connection.
  process.on("unhandledRejection", (err) => {
    logger.error("unhandledRejection", { err: String(err) });
  });
  process.on("uncaughtException", (err) => {
    logger.error("uncaughtException", { err: String(err) });
  });
}

main().catch((err) => {
  logger.error("fatal startup error", { err: String(err) });
  process.exit(1);
});
