ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS rr double precision,
  ADD COLUMN IF NOT EXISTS meets_strategy_params boolean,
  ADD COLUMN IF NOT EXISTS meets_apex_rules boolean,
  ADD COLUMN IF NOT EXISTS is_duplicate boolean,
  ADD COLUMN IF NOT EXISTS reasons text[],
  ADD COLUMN IF NOT EXISTS strategy_version text,
  ADD COLUMN IF NOT EXISTS actionable boolean
    GENERATED ALWAYS AS (
      COALESCE(meets_strategy_params,false)
      AND COALESCE(meets_apex_rules,false)
      AND NOT COALESCE(is_duplicate,false)
      AND direction='LONG'
    ) STORED;

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_tickets_actionable_open
  ON tickets(actionable, status, opened_at_utc DESC);

DROP VIEW IF EXISTS tickets_actionable_v;
CREATE VIEW tickets_actionable_v AS
  SELECT * FROM tickets
  WHERE actionable AND status='OPEN';
