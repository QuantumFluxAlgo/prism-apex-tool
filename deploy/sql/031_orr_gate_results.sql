-- 031_orr_gate_results.sql
-- Append-only ORR gate results (engineering-only; externally read-only).
-- Uniqueness: one row per (run_id, session_date, symbol) where run_id = one engine run invocation.
-- Retention: store forever for now; can be revisited later.

CREATE TABLE IF NOT EXISTS orr_gate_results (
  id                    BIGSERIAL PRIMARY KEY,
  run_id                UUID NOT NULL,
  session_date          DATE NOT NULL,
  symbol                TEXT NOT NULL,

  -- Identity layers (keep all; do not collapse these fields)
  engine_strategy_id     TEXT NOT NULL, -- e.g. ORR_V3 (planner identity)
  ticket_strategy_id     TEXT NOT NULL, -- e.g. APX-DDB-01 (operator/ticket identity)
  canonical_strategy_key TEXT NOT NULL, -- e.g. orr (DB/canonical key)

  -- Gate outcome
  actionable             BOOLEAN NOT NULL DEFAULT FALSE,
  reason                 TEXT NOT NULL,

  -- Context snapshots (exclude nothing; JSONB so we can evolve without schema churn)
  metrics                JSONB NOT NULL DEFAULT '{}'::jsonb,
  details                JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Provenance stamps (from P1-0 helper)
  engine_version         TEXT NOT NULL,
  config_fingerprint     TEXT NOT NULL,
  schema_version         INTEGER NOT NULL,
  computed_at_utc        TIMESTAMPTZ NOT NULL,

  created_at_utc         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce "one per (session_date, symbol) per run invocation"
CREATE UNIQUE INDEX IF NOT EXISTS ux_orr_gate_results_run_symbol_session
  ON orr_gate_results (run_id, session_date, symbol);

-- Common retrieval patterns
CREATE INDEX IF NOT EXISTS ix_orr_gate_results_session_symbol_created
  ON orr_gate_results (session_date, symbol, created_at_utc DESC);

CREATE INDEX IF NOT EXISTS ix_orr_gate_results_created
  ON orr_gate_results (created_at_utc DESC);

CREATE INDEX IF NOT EXISTS ix_orr_gate_results_actionable
  ON orr_gate_results (actionable);

CREATE INDEX IF NOT EXISTS ix_orr_gate_results_reason
  ON orr_gate_results (reason);
