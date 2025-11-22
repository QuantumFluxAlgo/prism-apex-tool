-- 011_strategy_config_audit.sql
-- Unified audit logging for strategy configuration changes.

CREATE TABLE IF NOT EXISTS strategy_config_audit (
  audit_id         BIGSERIAL PRIMARY KEY,
  strategy_key     TEXT NOT NULL,
  version          INTEGER NOT NULL,
  previous_version INTEGER,
  operator         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  params           JSONB NOT NULL,
  diff             JSONB
);

CREATE INDEX IF NOT EXISTS idx_strategy_config_audit_strategy_created_at
  ON strategy_config_audit (strategy_key, created_at DESC, version DESC);
