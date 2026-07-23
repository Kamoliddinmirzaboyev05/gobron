/**
 * Load Telegram matcher credentials from payment_settings (id=1).
 * Superadmin UI writes these; env is fallback.
 */
import { pool } from "../db/pool.js";
import { applyDbSettings, config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export async function loadMatcherSettingsFromDb(): Promise<void> {
  try {
    const res = await pool.query(
      `SELECT telegram_api_id, telegram_api_hash, telegram_phone,
              telegram_2fa_password, telegram_session, humo_bot_username
       FROM payment_settings
       WHERE id = 1
       LIMIT 1`,
    );
    if (res.rows[0]) {
      applyDbSettings(res.rows[0]);
      logger.info("matcher settings loaded from payment_settings", {
        apiId: config.telegram.apiId || null,
        hasHash: Boolean(config.telegram.apiHash),
        hasPhone: Boolean(config.telegram.phone),
        has2fa: Boolean(config.telegram.twoFaPassword),
        hasSession: Boolean(config.telegram.session),
        humoBot: config.humoBots[0],
      });
    } else {
      logger.warn("payment_settings row missing — using .env only");
    }
  } catch (err) {
    logger.warn("could not load payment_settings (using .env)", {
      err: String(err),
    });
  }
}

/** Persist new StringSession after first login so restarts skip OTP. */
export async function saveSessionToDb(session: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE payment_settings
       SET telegram_session = $1, updated_at = NOW()
       WHERE id = 1`,
      [session],
    );
    logger.info("telegram_session saved to payment_settings");
  } catch (err) {
    logger.error("failed to save telegram_session", { err: String(err) });
  }
}
