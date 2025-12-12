-- deploy/sql/030_worklist_v2_indexes.sql
-- PRISM APEX – Worklist V2 performance indexes
--
-- Non-destructive: indexes only. No tables, no data changes.
-- Targets the common Worklist query:
--   WHERE actionable IS TRUE AND status = 'OPEN'
--   DISTINCT ON (symbol, strategy, direction, opened_at_utc)
--   ORDER BY opened_at_utc DESC

DO
$$
BEGIN
  -- Partial index for Worklist-style queries on tickets
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  c.relkind = 'i'
    AND    c.relname = 'idx_tickets_worklist_actionable_open'
    AND    n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_tickets_worklist_actionable_open
      ON tickets (symbol, strategy, direction, opened_at_utc DESC)
      WHERE actionable IS TRUE AND status = 'OPEN';
  END IF;

  -- Supporting index for engine_tickets if we later back Worklist feed
  -- directly from engine audit instead of canonical tickets.
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  c.relkind = 'i'
    AND    c.relname = 'idx_engine_tickets_worklist_symbol_strategy_direction'
    AND    n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_engine_tickets_worklist_symbol_strategy_direction
      ON engine_tickets (symbol, strategy, direction, opened_at_utc DESC);
  END IF;
END;
$$;
