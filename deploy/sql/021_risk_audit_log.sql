-- EPIC 7 – risk_audit_log table
-- NOTE: Adjust numeric prefix to fit your migration sequence before running
-- migrations in CI/Prod.

CREATE TABLE IF NOT EXISTS risk_audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- "snapshot" => daily snapshot recorded
  -- "lockout"  => daily lockout decision recorded
  kind TEXT NOT NULL,
  trading_day DATE NOT NULL,
  source TEXT NOT NULL,      -- e.g. "operator-risk" | "ticketizer"
  reason TEXT NOT NULL,
  symbol TEXT NULL,
  account_id TEXT NULL,
  -- Snapshot payload (shape aligned with /api/operator-risk/daily DTO)
  snapshot JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_risk_audit_log_created_at
  ON risk_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_audit_log_trading_day
  ON risk_audit_log (trading_day);
