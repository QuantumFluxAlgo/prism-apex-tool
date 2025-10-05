-- 006: Backfill R:R and actionability for ORR tickets (idempotent)
-- Recompute R:R (LONG/SHORT) defensively and set actionable flag/reason for ORR.

DROP VIEW IF EXISTS tickets_actionable_v;

WITH rr_calc AS (
  SELECT
    id,
    CASE
      WHEN direction = 'LONG'
        AND entry_price IS NOT NULL
        AND stop_price IS NOT NULL
        AND target_price IS NOT NULL
        AND entry_price <> stop_price
      THEN (target_price - entry_price) / NULLIF(entry_price - stop_price, 0)
      WHEN direction = 'SHORT'
        AND entry_price IS NOT NULL
        AND stop_price IS NOT NULL
        AND target_price IS NOT NULL
        AND stop_price <> entry_price
      THEN (entry_price - target_price) / NULLIF(stop_price - entry_price, 0)
      ELSE NULL
    END AS rr_new
  FROM tickets
)
UPDATE tickets t
SET rr = r.rr_new
FROM rr_calc r
WHERE t.id = r.id AND r.rr_new IS NOT NULL;

UPDATE tickets
SET actionable = CASE
      WHEN status <> 'OPEN' THEN FALSE
      WHEN direction <> 'LONG' THEN FALSE
      WHEN rr IS NULL THEN FALSE
      WHEN rr < 2.0 THEN FALSE
      WHEN rr > 4.5 THEN FALSE
      ELSE TRUE
    END,
    non_actionable_reason = CASE
      WHEN status <> 'OPEN' THEN 'Not OPEN'
      WHEN direction <> 'LONG' THEN 'SHORT is view-only'
      WHEN rr IS NULL THEN 'Missing R:R'
      WHEN rr < 2.0 THEN 'RR below 2.0'
      WHEN rr > 4.5 THEN 'RR above 4.5 cap'
      ELSE NULL
    END
WHERE strategy = 'ORR';

CREATE VIEW tickets_actionable_v AS
SELECT *
FROM tickets
WHERE actionable IS TRUE
  AND status = 'OPEN'
  AND direction = 'LONG';

CREATE INDEX IF NOT EXISTS ix_tickets_rr ON tickets(rr);
CREATE INDEX IF NOT EXISTS ix_tickets_actionable ON tickets(actionable);
