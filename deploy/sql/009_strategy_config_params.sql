ALTER TABLE orr_config ADD COLUMN IF NOT EXISTS params jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE osb_config ADD COLUMN IF NOT EXISTS params jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE vwap_ft_config ADD COLUMN IF NOT EXISTS params jsonb NOT NULL DEFAULT '{}'::jsonb;
