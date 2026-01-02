-- Migration: create session_metrics table
-- Purpose: per-symbol × session metrics backing ORR, VWAP FT, OSB, and future strategies.

CREATE TABLE IF NOT EXISTS session_metrics (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    session_date DATE NOT NULL,
    session_type TEXT NOT NULL,
    session_key TEXT,
    session_start_ts TIMESTAMPTZ,
    session_end_ts TIMESTAMPTZ,

    -- Volatility & range
    session_atr_points DOUBLE PRECISION,
    session_atr_bucket TEXT,
    intraday_range_points DOUBLE PRECISION,
    overnight_range_points DOUBLE PRECISION,
    vol_regime TEXT,

    -- Opening Range (OR) metrics
    or_start_ts TIMESTAMPTZ,
    or_end_ts TIMESTAMPTZ,
    or_length_minutes INTEGER,
    or_high DOUBLE PRECISION,
    or_low DOUBLE PRECISION,
    or_width_points DOUBLE PRECISION,
    or_width_to_atr_ratio DOUBLE PRECISION,

    -- VWAP & trend context
    vwap_open_value DOUBLE PRECISION,
    vwap_close_value DOUBLE PRECISION,
    vwap_slope TEXT,
    price_vs_vwap_at_or_end TEXT,
    htf_trend_bias TEXT,

    -- Liquidity & volume
    avg_volume_first_30m DOUBLE PRECISION,
    volume_spike_flag BOOLEAN,
    liquidity_regime TEXT,

    -- News flags (config-driven)
    has_major_news_today BOOLEAN,
    news_window TEXT,
    news_label TEXT,

    -- Session quality / skip metadata
    session_quality_flag TEXT,
    session_skip_reason TEXT
);

-- Unique constraint: one row per symbol × session_date × session_type.
CREATE UNIQUE INDEX IF NOT EXISTS session_metrics_symbol_date_type_idx
    ON session_metrics (symbol, session_date, session_type);

-- Helpful index for date-based queries.
CREATE INDEX IF NOT EXISTS session_metrics_symbol_date_idx
    ON session_metrics (symbol, session_date);

-- Optional index on session_key if used for joins.
CREATE INDEX IF NOT EXISTS session_metrics_session_key_idx
    ON session_metrics (session_key);
