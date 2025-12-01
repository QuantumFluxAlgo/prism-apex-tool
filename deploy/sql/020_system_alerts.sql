-- EPIC 5 – system_alerts table
-- NOTE: File number (020/099/etc.) may need to be adjusted to fit your existing
-- migration sequence before running migrations in CI/Prod.

CREATE TABLE IF NOT EXISTS system_alerts (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity TEXT NOT NULL,        -- e.g. "info" | "warning" | "error"
  source TEXT NOT NULL,          -- e.g. "scheduler" | "operator-risk" | "ticketizer"
  code TEXT NOT NULL,            -- e.g. "JOB_FAILED", "DAILY_LOCKOUT"
  message TEXT NOT NULL,
  job_name TEXT NULL,
  entity_type TEXT NULL,         -- e.g. "job" | "symbol" | "account"
  entity_id TEXT NULL,
  is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  details JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at
  ON system_alerts (created_at DESC);
