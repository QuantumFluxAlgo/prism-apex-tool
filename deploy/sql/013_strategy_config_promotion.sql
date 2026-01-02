-- 013_strategy_config_promotion.sql
-- Tracks the single production/promotion pointer per strategy.

CREATE TABLE IF NOT EXISTS strategy_config_promotion (
  strategy TEXT PRIMARY KEY CHECK (strategy IN ('orr','osb','vwap_ft')),
  promoted_version INT NOT NULL CHECK (promoted_version > 0),
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  operator TEXT NULL
);
