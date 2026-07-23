/**
 * Matching engine: map a parsed Humo amount → pending payment_intent.
 *
 * Side effects on success (same as backend approve):
 *   - intent.status = paid
 *   - owner fields is_active = true
 *   - subscription_payments row (approved)
 *
 * Edge cases:
 *   - Idempotency via message_hash unique
 *   - Late payment after TTL → expired_paid + unmatched log
 *   - No match → unmatched_transactions
 */
import crypto from "node:crypto";
import type pg from "pg";
import { withClient } from "../db/pool.js";
import { logger } from "../utils/logger.js";
import type { ParsedPayment } from "./paymentParser.js";

export type MatchResult =
  | { kind: "paid"; intentId: number; ownerId: number; amount: number }
  | { kind: "expired_paid"; intentId: number; amount: number }
  | { kind: "unmatched"; amount: number | null; reason: string }
  | { kind: "duplicate"; messageHash: string }
  | { kind: "parse_error" };

function hashMessage(raw: string): string {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

async function alreadyProcessed(client: pg.PoolClient, messageHash: string): Promise<boolean> {
  const a = await client.query(
    `SELECT 1 FROM payment_intents WHERE message_hash = $1 LIMIT 1`,
    [messageHash],
  );
  if ((a.rowCount ?? 0) > 0) return true;
  const b = await client.query(
    `SELECT 1 FROM unmatched_transactions WHERE message_hash = $1 LIMIT 1`,
    [messageHash],
  );
  return (b.rowCount ?? 0) > 0;
}

async function logUnmatched(
  client: pg.PoolClient,
  amount: number | null,
  raw: string,
  messageHash: string,
  reason: string,
): Promise<void> {
  await client.query(
    `INSERT INTO unmatched_transactions (amount, raw_message, message_hash, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (message_hash) DO NOTHING`,
    [amount, raw, messageHash, reason],
  );
}

async function activateOwner(client: pg.PoolClient, ownerId: number, amount: number, intentId: number): Promise<void> {
  await client.query(`UPDATE fields SET is_active = true WHERE owner_id = $1`, [ownerId]);
  await client.query(
    `INSERT INTO subscription_payments (owner_id, amount, receipt_image, status)
     VALUES ($1, $2, $3, 'approved')`,
    [ownerId, amount, `humo://intent/${intentId}`],
  );
}

/**
 * Try to match a Telegram Humo message to a payment intent.
 * Never throws to the caller for business cases — returns a result object.
 */
export async function matchPaymentMessage(
  rawMessage: string,
  parsed: ParsedPayment | null,
): Promise<MatchResult> {
  const messageHash = hashMessage(rawMessage);

  try {
    return await withClient(async (client) => {
      await client.query("BEGIN");

      try {
        if (await alreadyProcessed(client, messageHash)) {
          await client.query("COMMIT");
          return { kind: "duplicate", messageHash };
        }

        if (!parsed) {
          await logUnmatched(client, null, rawMessage, messageHash, "parse_error");
          await client.query("COMMIT");
          return { kind: "parse_error" };
        }

        const amount = parsed.amount;

        // 1) Active pending, not expired
        const pending = await client.query<{
          id: number;
          owner_id: number;
        }>(
          `SELECT id, owner_id FROM payment_intents
           WHERE status = 'pending'
             AND unique_amount = $1
             AND expires_at > NOW()
           ORDER BY created_at ASC
           LIMIT 1
           FOR UPDATE`,
          [amount],
        );

        if (pending.rows[0]) {
          const { id, owner_id } = pending.rows[0];
          await client.query(
            `UPDATE payment_intents
             SET status = 'paid',
                 paid_at = NOW(),
                 matched_message = $2,
                 message_hash = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [id, rawMessage, messageHash],
          );
          await activateOwner(client, owner_id, amount, id);
          await client.query("COMMIT");
          logger.info("payment matched → paid", { intentId: id, ownerId: owner_id, amount });
          return { kind: "paid", intentId: id, ownerId: owner_id, amount };
        }

        // 2) Recently expired pending with same amount → expired_paid
        const expired = await client.query<{ id: number; owner_id: number }>(
          `SELECT id, owner_id FROM payment_intents
           WHERE unique_amount = $1
             AND status IN ('pending', 'expired')
             AND expires_at <= NOW()
           ORDER BY created_at DESC
           LIMIT 1
           FOR UPDATE`,
          [amount],
        );

        if (expired.rows[0]) {
          const { id } = expired.rows[0];
          await client.query(
            `UPDATE payment_intents
             SET status = 'expired_paid',
                 paid_at = NOW(),
                 matched_message = $2,
                 message_hash = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [id, rawMessage, messageHash],
          );
          await logUnmatched(client, amount, rawMessage, messageHash, "expired");
          await client.query("COMMIT");
          logger.warn("payment after TTL → expired_paid", { intentId: id, amount });
          return { kind: "expired_paid", intentId: id, amount };
        }

        // 3) No intent at all
        await logUnmatched(client, amount, rawMessage, messageHash, "no_match");
        await client.query("COMMIT");
        logger.warn("unmatched humo payment", { amount });
        return { kind: "unmatched", amount, reason: "no_match" };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
  } catch (err) {
    logger.error("matchPaymentMessage failed", { err: String(err) });
    // Best-effort: do not crash the userbot loop
    return { kind: "unmatched", amount: parsed?.amount ?? null, reason: "error" };
  }
}

/** Expire stale pending intents (also done by API; belt-and-suspenders). */
export async function expireStaleIntents(): Promise<number> {
  const res = await withClient((c) =>
    c.query(
      `UPDATE payment_intents
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'pending' AND expires_at < NOW()`,
    ),
  );
  return res.rowCount ?? 0;
}
