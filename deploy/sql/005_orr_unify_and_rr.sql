-- 005: Unify strategy naming to 'ORR', add rr/reason columns, fast view for actionable
-- Safe to re-run.

-- Drop dependent view before altering columns
DROP VIEW IF EXISTS tickets_actionable_v;

-- 0. If actionable was previously generated, drop so we can persist explicit flag
ALTER TABLE tickets DROP COLUMN IF EXISTS actionable;

-- 1. Columns (if missing)
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS rr double precision,
  ADD COLUMN IF NOT EXISTS actionable boolean,
  ADD COLUMN IF NOT EXISTS non_actionable_reason text;

-- 2. Backfill: unify strategy naming in place (keep history queryable)
UPDATE tickets
SET strategy = 'ORR'
WHERE strategy IN ('APX-DDB-01','apx-ddb-01','Open Range Retest','open-range-retest')
  AND strategy <> 'ORR';

-- 3. Normalize existing rows’ actionable gate (server also enforces; this is for views/queries)
-- Rules (today):
--   * LONG only
--   * status OPEN
--   * rr between 1.1 and 1.9 inclusive
WITH base AS (
  SELECT id, direction, status, rr
  FROM tickets
)
UPDATE tickets t
SET actionable =
    CASE
      WHEN direction='LONG' AND status='OPEN' AND rr IS NOT NULL AND rr BETWEEN 1.1 AND 1.9
           THEN TRUE
      ELSE FALSE
    END,
    non_actionable_reason =
    CASE
      WHEN direction <> 'LONG' THEN 'SHORT is view-only'
      WHEN status <> 'OPEN' THEN 'Not OPEN'
      WHEN rr IS NULL THEN 'Missing R:R'
      WHEN rr < 1.1 THEN 'R:R below 1.1'
      WHEN rr > 1.9 THEN 'R:R above 1.9'
      ELSE NULL
    END
WHERE t.id IN (SELECT id FROM base);

-- 4. Helpful view for fast operator lookups
CREATE VIEW tickets_actionable_v AS
SELECT *
FROM tickets
WHERE actionable IS TRUE
  AND status = 'OPEN'
  AND direction = 'LONG';

-- 5. Indices
CREATE INDEX IF NOT EXISTS ix_tickets_strategy ON tickets(strategy);
CREATE INDEX IF NOT EXISTS ix_tickets_rr ON tickets(rr);
CREATE INDEX IF NOT EXISTS ix_tickets_actionable ON tickets(actionable);
