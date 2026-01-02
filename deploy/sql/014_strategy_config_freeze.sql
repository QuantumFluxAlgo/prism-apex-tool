-- 014_strategy_config_freeze.sql
-- Stores strict freeze pointers per strategy to block rollbacks to older versions.

CREATE TABLE IF NOT EXISTS strategy_config_freeze (
  strategy TEXT PRIMARY KEY CHECK (strategy IN ('orr','osb','vwap_ft')),
  frozen_up_to_version INT NOT NULL CHECK (frozen_up_to_version > 0),
  frozen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  operator TEXT NULL
);
