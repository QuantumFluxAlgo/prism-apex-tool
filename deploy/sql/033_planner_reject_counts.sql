-- 033_planner_reject_counts.sql
--
-- Purpose
--   Aggregated counters for "why we did NOT produce an actionable ticket".
--   This is NOT per-run append-only history; this is an aggregated counter table.
--
-- Design
--   - Keyed by (session_date, symbol, requested_planner, rejecting_planner, reject_stage, reason_code)
--   - requested_planner: what the run invocation asked for (vwap_ft | osb | ddb)
--   - rejecting_planner: which planner's candidate ultimately got dropped/rejected
--       - For PLANNER stage: the planner itself.
--       - For SAFETY/RISK/PERSISTENCE/TICKETIZER stage: the planner whose candidate was dropped downstream.
--   - Counters are updated via upsert semantics (INSERT ... ON CONFLICT DO UPDATE).
--   - Provenance stamp fields are refreshed on each increment so we can always trace back to the
--     current engine version + config fingerprint logic.
--
-- Retention
--   Store forever. If we later need retention/partitioning, we can add it without changing keys.

BEGIN;

CREATE TABLE IF NOT EXISTS planner_reject_counts (
  session_date        date        NOT NULL,
  symbol              text        NOT NULL,

  requested_planner   text        NOT NULL, -- vwap_ft | osb | ddb
  rejecting_planner   text        NOT NULL, -- vwap_ft | osb | ddb

  reject_stage        text        NOT NULL, -- PLANNER | SAFETY | RISK | PERSISTENCE | TICKETIZER
  reason_code         text        NOT NULL, -- stable enum bucket (see plannerRejectVocab.ts)

  count               bigint      NOT NULL DEFAULT 0,

  -- Provenance stamps (engineering-only)
  engine_version      text        NOT NULL DEFAULT '',
  config_fingerprint  text        NOT NULL DEFAULT '',
  schema_version      integer     NOT NULL DEFAULT 1,
  computed_at_utc     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planner_reject_counts_pk PRIMARY KEY (
    session_date,
    symbol,
    requested_planner,
    rejecting_planner,
    reject_stage,
    reason_code
  )
);

-- Common query patterns: session-first slicing
CREATE INDEX IF NOT EXISTS ix_planner_reject_counts_session_date
  ON planner_reject_counts (session_date);

CREATE INDEX IF NOT EXISTS ix_planner_reject_counts_session_symbol
  ON planner_reject_counts (session_date, symbol);

CREATE INDEX IF NOT EXISTS ix_planner_reject_counts_session_requested
  ON planner_reject_counts (session_date, requested_planner);

CREATE INDEX IF NOT EXISTS ix_planner_reject_counts_session_rejecting
  ON planner_reject_counts (session_date, rejecting_planner);

CREATE INDEX IF NOT EXISTS ix_planner_reject_counts_session_stage
  ON planner_reject_counts (session_date, reject_stage);

CREATE INDEX IF NOT EXISTS ix_planner_reject_counts_session_reason
  ON planner_reject_counts (session_date, reason_code);

COMMIT;
