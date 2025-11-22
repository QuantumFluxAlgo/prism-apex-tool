-- 012_engine_tickets.sql
-- Audit table for engine-produced tickets (approved & rejected)

CREATE TABLE IF NOT EXISTS engine_tickets (
  id               BIGSERIAL PRIMARY KEY,
  symbol           TEXT NOT NULL,
  strategy         TEXT NOT NULL,
  direction        TEXT NOT NULL,
  contracts        INTEGER NOT NULL DEFAULT 0,
  entry_price      DOUBLE PRECISION NOT NULL,
  stop_price       DOUBLE PRECISION NOT NULL,
  target_price     DOUBLE PRECISION,
  risk_dollars     DOUBLE PRECISION NOT NULL DEFAULT 0,
  engine_timestamp TIMESTAMPTZ NOT NULL,
  session_date     DATE NOT NULL,
  status           TEXT NOT NULL,
  rejection_reason TEXT,
  engine_version   TEXT NOT NULL,
  meta             JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engine_tickets_direction_chk CHECK (direction IN ('LONG', 'SHORT')),
  CONSTRAINT engine_tickets_status_chk CHECK (status IN ('approved', 'rejected')),
  CONSTRAINT engine_tickets_contracts_chk CHECK (contracts >= 0),
  CONSTRAINT engine_tickets_risk_chk CHECK (risk_dollars >= 0)
);

CREATE INDEX IF NOT EXISTS idx_engine_tickets_symbol_session_date
  ON engine_tickets (symbol, session_date);

CREATE INDEX IF NOT EXISTS idx_engine_tickets_strategy_status_session_date
  ON engine_tickets (strategy, status, session_date);

CREATE INDEX IF NOT EXISTS idx_engine_tickets_engine_timestamp
  ON engine_tickets (engine_timestamp);
