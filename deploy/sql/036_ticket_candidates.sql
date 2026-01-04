-- 036_ticket_candidates.sql
-- Ticket Candidates Ledger (TICKETIZER rejects only)
--
-- Purpose:
-- - Persist rejected ticket candidates (from Ticketizer) without impacting lifecycle tickets.
-- - Enable Tickets page to show Accepted (tickets table) vs Rejected (ticket_candidates) via a filter.

CREATE TABLE IF NOT EXISTS public.ticket_candidates (
  id BIGSERIAL PRIMARY KEY,

  -- The engine/suggestion timestamp for the candidate (the “session time” you wanted).
  session_ts_utc TIMESTAMPTZ NOT NULL,

  -- Convenient derived session date for partitioning/filtering.
  session_date DATE GENERATED ALWAYS AS ((session_ts_utc AT TIME ZONE 'utc')::date) STORED,

  symbol TEXT NOT NULL,
  strategy TEXT NOT NULL,
  direction TEXT NOT NULL
    CONSTRAINT ticket_candidates_direction_chk CHECK (direction IN ('LONG','SHORT')),

  entry_price NUMERIC(18,6) NOT NULL,
  stop_price  NUMERIC(18,6),
  target_price NUMERIC(18,6),

  -- Ticketizer sizing may reject to zero; we still persist the candidate.
  qty INTEGER NOT NULL DEFAULT 0,

  rr_multiple DOUBLE PRECISION,
  risk_dollars DOUBLE PRECISION,

  -- “Why it was rejected” – keep both the primary string and the raw reasons list.
  rejection_reason TEXT,
  reject_reasons TEXT[],

  -- Preserve the full context for audit/debug (canonicalCandidate, risk meta, etc.)
  meta JSONB,

  source TEXT NOT NULL DEFAULT 'ticketizer',

  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),

  -- Prevent obvious duplicates if Ticketizer replays the same moment.
  CONSTRAINT ticket_candidates_uniq
    UNIQUE (symbol, strategy, direction, session_ts_utc)
);

CREATE INDEX IF NOT EXISTS idx_ticket_candidates_session_date
  ON public.ticket_candidates (session_date DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_candidates_symbol_strategy_ts
  ON public.ticket_candidates (symbol, strategy, session_ts_utc DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_candidates_created_at
  ON public.ticket_candidates (created_at_utc DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_candidates_reject_reasons_gin
  ON public.ticket_candidates USING GIN (reject_reasons);

