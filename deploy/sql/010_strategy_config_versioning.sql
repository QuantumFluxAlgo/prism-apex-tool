-- 010_strategy_config_versioning.sql
-- Append-only versioning support (indexes for latest-row lookups)

CREATE INDEX IF NOT EXISTS idx_orr_config_version_created_at
  ON orr_config (version DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_osb_config_version_created_at
  ON osb_config (version DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_vwap_ft_config_version_created_at
  ON vwap_ft_config (version DESC, created_at DESC, id DESC);
