-- 035_shadow_outcomes_fix_types.sql
-- Repair existing installs where shadow_outcomes was created with TEXT columns + legacy checks.
-- Goal: enforce enum types for variant/outcome and remove legacy check constraints.

BEGIN;

-- Ensure enums exist (idempotent)
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

-- Fail fast if unknown legacy values exist (prevents silent corruption)
DO $$
DECLARE
  bad_variants text;
  bad_outcomes text;
BEGIN
  SELECT string_agg(DISTINCT variant::text, ', ')
    INTO bad_variants
  FROM public.shadow_outcomes
  WHERE variant IS NOT NULL
    AND variant::text NOT IN ('RAW','BE_1R');

  IF bad_variants IS NOT NULL THEN
    RAISE EXCEPTION 'shadow_outcomes has unsupported variant values: %', bad_variants;
  END IF;

  SELECT string_agg(DISTINCT outcome::text, ', ')
    INTO bad_outcomes
  FROM public.shadow_outcomes
  WHERE outcome IS NOT NULL
    AND outcome::text NOT IN ('TARGET','STOP','NEITHER','INSUFFICIENT_DATA','NONE','BREAKEVEN');

  IF bad_outcomes IS NOT NULL THEN
    RAISE EXCEPTION 'shadow_outcomes has unsupported outcome values: %', bad_outcomes;
  END IF;
END$$;

-- Drop legacy checks (they conflict with the enum contract)
ALTER TABLE public.shadow_outcomes
  DROP CONSTRAINT IF EXISTS shadow_outcomes_variant_chk,
  DROP CONSTRAINT IF EXISTS shadow_outcomes_outcome_chk;

-- Convert TEXT -> ENUM
ALTER TABLE public.shadow_outcomes
  ALTER COLUMN variant TYPE public.shadow_variant
  USING variant::public.shadow_variant;

-- Map legacy outcomes to the canonical enum:
--   NONE -> NEITHER
--   BREAKEVEN -> NEITHER  (BE semantics are represented via be_triggered/be_trigger_ts_utc, not outcome)
ALTER TABLE public.shadow_outcomes
  ALTER COLUMN outcome TYPE public.shadow_outcome
  USING (
    CASE
      WHEN outcome::text = 'NONE' THEN 'NEITHER'
      WHEN outcome::text = 'BREAKEVEN' THEN 'NEITHER'
      ELSE outcome::text
    END
  )::public.shadow_outcome;

COMMIT;
