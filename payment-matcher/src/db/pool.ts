/**
 * Shared PostgreSQL pool (pg). Same database as gobron-backend.
 */
import pg from "pg";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 5,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  logger.error("unexpected pg pool error", { err: String(err) });
});

export async function withClient<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
