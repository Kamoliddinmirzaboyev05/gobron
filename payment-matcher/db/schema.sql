-- Reference schema for Humo P2P matcher tables.
-- Production applies this via gobron-backend Alembic migration
-- `20260723_payment_intents`. This file is for standalone review / ops.

-- Optional: monthly fee on platform card settings
-- ALTER TABLE payment_settings
--   ADD COLUMN IF NOT EXISTS subscription_amount NUMERIC(12,2) NOT NULL DEFAULT 50000;

CREATE TABLE IF NOT EXISTS payment_intents (
  id              SERIAL PRIMARY KEY,
  owner_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_amount     INTEGER NOT NULL,
  unique_amount   INTEGER NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | paid | expired | expired_paid
  expires_at      TIMESTAMPTZ NOT NULL,
  paid_at         TIMESTAMPTZ,
  matched_message TEXT,
  message_hash    VARCHAR(64) UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One pending intent per unique amount at a time
CREATE UNIQUE INDEX IF NOT EXISTS ix_payment_intents_pending_amount
  ON payment_intents (unique_amount)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ix_payment_intents_status_expires
  ON payment_intents (status, expires_at);

CREATE TABLE IF NOT EXISTS unmatched_transactions (
  id            SERIAL PRIMARY KEY,
  amount        INTEGER,
  raw_message   TEXT NOT NULL,
  message_hash  VARCHAR(64) NOT NULL UNIQUE,
  reason        VARCHAR(40) NOT NULL DEFAULT 'no_match',
  -- no_match | expired | parse_error
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
