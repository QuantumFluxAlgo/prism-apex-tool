CREATE TABLE IF NOT EXISTS operator_daily_risk (
  operator_id TEXT NOT NULL,
  trading_date DATE NOT NULL,
  daily_risk_limit_usd NUMERIC(12,2) NOT NULL DEFAULT 2000,
  daily_risk_used_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,
  override_reason TEXT,
  PRIMARY KEY (operator_id, trading_date),
  CHECK (daily_risk_limit_usd >= 0),
  CHECK (daily_risk_used_usd >= 0)
);

CREATE TABLE IF NOT EXISTS operator_session_risk (
  operator_id TEXT NOT NULL,
  session_date_utc DATE NOT NULL,
  daily_risk_limit_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  risk_used_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (operator_id, session_date_utc),
  CHECK (daily_risk_limit_usd >= 0),
  CHECK (risk_used_usd >= 0)
);

CREATE TABLE IF NOT EXISTS strategy_config_promotion (
  strategy TEXT NOT NULL,
  promoted_version TEXT NOT NULL,
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (strategy)
);
