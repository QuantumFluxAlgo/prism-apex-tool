-- ORR gating + continuation support
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS actionable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS non_actionable_reason text,
  ADD COLUMN IF NOT EXISTS meta jsonb;

-- Optional: relate continuation child to parent ticket
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS parent_ticket_id uuid;
