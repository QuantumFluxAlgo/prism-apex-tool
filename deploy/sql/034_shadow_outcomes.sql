-- 034_shadow_outcomes.sql
-- P1-4 Shadow Outcomes: minimal "would it have hit stop/target?" outcomes per ticket from stored 1m bars.
-- Canonical contract:
--   variant: shadow_variant enum (RAW, BE_1R)
--   outcome: shadow_outcome enum (TARGET, STOP, NEITHER, INSUFFICIENT_DATA)

BEGIN;

-- Enums (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shadow_variant') THEN
    CREATE TYPE public.shadow_variant AS ENUM ('RAW', 'BE_1R');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shadow_outcome') THEN
    CREATE TYPE public.shadow_outcome AS ENUM ('TARGET', 'STOP', 'NEITHER', 'INSUFFICIENT_DATA');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.shadow_outcomes (
  ticket_id           uuid                     NOT NULL,
  horizon_minutes     integer                  NOT NULL,
  variant             public.shadow_variant    NOT NULL,

  anchor_ts_utc       timestamptz              NOT NULL,
  window_end_ts_utc   timestamptz              NOT NULL,

  outcome             public.shadow_outcome    NOT NULL,
  outcome_ts_utc      timestamptz              NULL,

  stop_touched        boolean                  NOT NULL DEFAULT false,
  target_touched      boolean                  NOT NULL DEFAULT false,

  -- BE-1R metadata (BE is represented here, not as an outcome)
  be_triggered        boolean                  NOT NULL DEFAULT false,
  be_trigger_ts_utc   timestamptz              NULL,

  bars_expected       integer                  NOT NULL DEFAULT 0,
  bars_scanned        integer                  NOT NULL DEFAULT 0,

  computed_at_utc     timestamptz              NOT NULL DEFAULT now(),
  meta                jsonb                    NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT shadow_outcomes_pk PRIMARY KEY (ticket_id, horizon_minutes, variant),
  CONSTRAINT shadow_outcomes_ticket_fk FOREIGN KEY (ticket_id)
    REFERENCES public.tickets(id) ON DELETE CASCADE,
  CONSTRAINT shadow_outcomes_horizon_chk CHECK (horizon_minutes > 0)
);

CREATE INDEX IF NOT EXISTS shadow_outcomes_ticket_id_idx
  ON public.shadow_outcomes(ticket_id);

CREATE INDEX IF NOT EXISTS shadow_outcomes_computed_at_idx
  ON public.shadow_outcomes(computed_at_utc);

COMMIT;
