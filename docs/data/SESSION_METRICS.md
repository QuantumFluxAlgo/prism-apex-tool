# SessionMetrics Model Design

## Purpose

`SessionMetrics` is the strategy-agnostic, per-session metrics backbone for Prism Apex.

- One row = one `symbol × session` (e.g. ESZ5 on a given RTH date).
- All strategies (ORR, VWAP First Touch, OSB, future) read from this.
- Populated from bar data + static config (including a simple news calendar).
- Used by:
  - Strategies to decide whether to arm/fire,
  - Risk engine to understand ATR/vol/liquidity regimes,
  - UI (Worklist, Status, Reports, Market Data overlays) as context.

Schema will be implemented later via the repo’s existing migration tooling.

## Identity & time bounds

- `id` — PK (UUID or bigserial).
- `symbol` (text).
- `session_date` (date).
- `session_type` (enum: e.g. RTH, GLOBEX, HALF_DAY).
- `session_key` (text, optional synthetic ID).
- `session_start_ts` (timestamptz).
- `session_end_ts` (timestamptz).

## Volatility & range

- `session_atr_points` (numeric).
- `session_atr_bucket` (enum: LOW / MEDIUM / HIGH or similar).
- `intraday_range_points` (numeric).
- `overnight_range_points` (numeric).
- `vol_regime` (enum: LOW / NORMAL / HIGH).

## Opening Range (OR) metrics

- `or_start_ts` (timestamptz).
- `or_end_ts` (timestamptz).
- `or_length_minutes` (int).
- `or_high` (numeric).
- `or_low` (numeric).
- `or_width_points` (numeric).
- `or_width_to_atr_ratio` (numeric).

## VWAP & trend context

- `vwap_open_value` (numeric) — VWAP at OR end or chosen reference.
- `vwap_close_value` (numeric) — VWAP at session end (diagnostic).
- `vwap_slope` (enum: UP / DOWN / FLAT).
- `price_vs_vwap_at_or_end` (enum: ABOVE / BELOW / AROUND).
- `htf_trend_bias` (enum: UP / DOWN / SIDEWAYS).

## Liquidity & volume

- `avg_volume_first_30m` (numeric).
- `volume_spike_flag` (boolean).
- `liquidity_regime` (enum: NORMAL / THIN / DISTORTED).

## News flags (config-driven, minimal)

- `has_major_news_today` (boolean).
- `news_window` (enum, nullable: PRE_OPEN / RTH_MORNING / RTH_AFTERNOON / NULL).
- `news_label` (text, nullable: e.g. "CPI", "FOMC").

## Session quality / skip metadata

- `session_quality_flag` (enum: OK / AVOID / ERROR).
- `session_skip_reason` (text, nullable; codes like LOW_ATR, OR_TOO_WIDE, RISK_BLOCKED, NEWS_LOCKOUT, BAD_DATA).

## Relationships

- Bars: SessionMetrics aggregates over bars belonging to the same `symbol × session`.
- Signals: strategies link to SessionMetrics via session id + symbol instead of recomputing ATR/OR/VWAP.
- Tickets: tickets copy key fields (ATR bucket, vol_regime, liquidity_regime) at generation time for reporting.

## Ownership & implementation notes

- Owner: the backend service that currently handles tickets/market data (exact path will follow existing DB tooling).
- Implementation: added via the existing migration framework (SQL/Prisma/Knex/etc.), with indexes on `symbol`, `session_date`, `session_key`.
- Testing:
  - Golden Day fixtures will assert correct SessionMetrics rows for known past sessions.


## Schema status

An initial `session_metrics` table migration has been created under `tools/ops/sql` using a timestamped filename:
- `<timestamp>-session-metrics.sql`

It defines the fields described above (identity/time, ATR/vol, OR, VWAP, liquidity, news, quality)
and basic indexes for (`symbol`, `session_date`, `session_type`) and `session_key`.
