ALTER TABLE IF EXISTS tickets
  ADD COLUMN IF NOT EXISTS status varchar(16) DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS completed_at_utc timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by     varchar(64),
  ADD COLUMN IF NOT EXISTS completed_note   varchar(80);

UPDATE tickets
   SET status = CASE
                 WHEN status = 'COMPLETE' THEN status
                 WHEN closed_at_utc IS NOT NULL THEN 'CLOSED'
                 ELSE 'OPEN'
               END
 WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_status_completed_at ON tickets (status, completed_at_utc DESC);
