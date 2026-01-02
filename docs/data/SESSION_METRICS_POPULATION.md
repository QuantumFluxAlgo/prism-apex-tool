# SessionMetrics Population Design

## 1. Purpose

This document describes **how and when** `session_metrics` rows will be populated for each `symbol × session`.

- It **does not** change runtime behaviour yet.
- It defines the plan that future implementation steps and tests (including Golden Days) will follow.
- Goal: every strategy (ORR, VWAP First Touch, OSB, future) can rely on a consistent, precomputed `SessionMetrics` record.


## 2. Inputs & ownership

### 2.1 Owning service/job

SessionMetrics population will be owned by the same backend area that currently manages:

- bar/market data ingestion, and
- strategy/ticket jobs.

Based on current repo structure (apps/api jobs, tools/ops SQL, db scripts), the likely owner is:

- an API/worker job under `apps/api/src/jobs` (or an equivalent batch job) that:
  - has access to bar data tables,
  - can schedule per-session computations,
  - can log and surface issues.

Exact module will be chosen during implementation, but the logic is centralised: one owner populates `session_metrics`.


### 2.2 Data sources

SessionMetrics will read from:

- **Bar / candle data**
  - 1m bars (and possibly 5m/15m) stored in the existing DB tables used by the dashboard/strategies.
  - These provide OHLCV needed for:
    - ATR calculation,
    - intraday range,
    - OR high/low,
    - VWAP computation,
    - volume summaries.

- **Config**
  - Instrument definitions (tick size, tick value, sessions).
  - Session calendar (RTH open/close, half-days).
  - News calendar (config-only, e.g. CPI/FOMC by date/time window).

No external APIs are required for this population step; all data comes from existing bars + config.


## 3. Timing / scheduling

### 3.1 Initial implementation (batch-oriented)

For the first implementation, SessionMetrics will be populated in a **batch job** with the following characteristics:

- Runs after the relevant session completes (e.g. shortly after RTH close).
- For each `symbol` configured for Prism Apex:
  - identifies the just-finished session,
  - computes or updates a single `session_metrics` row.

Benefits:

- Simple to reason about.
- Deterministic and easy to replay.
- Compatible with Golden Day replays (same code, different bar source).

### 3.2 Future enhancement (near-real-time)

Later, if needed:

- SessionMetrics could be updated incrementally:
  - e.g. preliminary metrics after OR end,
  - final metrics after session close.
- ORR and other strategies might read a “preliminary” snapshot once OR is complete.

This is explicitly **out of scope** for the initial wiring; this doc just notes the possibility.


## 4. Population algorithm (high-level)

For each `symbol × session`:

1. **Determine session bounds**
   - Use session calendar/config:
     - derive `session_start_ts`, `session_end_ts`,
     - classify `session_type` (RTH, GLOBEX, HALF_DAY).

2. **Select bars**
   - Query bar table(s) for:
     - all bars between `session_start_ts` and `session_end_ts`,
     - optionally use pre-OR subset for initial ATR.

3. **Compute volatility & range**
   - `session_atr_points`:
     - ATR over a configured lookback (e.g. 20 periods) using 1m bars.
   - `intraday_range_points`:
     - high-low of all session bars.
   - `overnight_range_points`:
     - difference between prior close and session open.
   - `session_atr_bucket` and `vol_regime`:
     - bucketisation/enum based on ATR percentiles or config thresholds.

4. **Compute Opening Range (OR) metrics**
   - Determine OR window:
     - start at RTH open, dynamic length (10–30 minutes) according to rules.
   - On bars within OR window:
     - `or_high` = max high,
     - `or_low` = min low,
     - `or_width_points` = `or_high - or_low`,
     - `or_width_to_atr_ratio` = `or_width_points / session_atr_points`.
   - Record `or_start_ts`, `or_end_ts`, `or_length_minutes`.

5. **Compute VWAP & trend context**
   - Compute VWAP over the session (or up to OR end) from OHLCV.
   - Record:
     - `vwap_open_value` (VWAP at OR end or reference time),
     - `vwap_close_value` (VWAP at session end; diagnostic),
     - `vwap_slope` (UP / DOWN / FLAT over a configured window),
     - `price_vs_vwap_at_or_end` (ABOVE / BELOW / AROUND),
     - `htf_trend_bias` (UP / DOWN / SIDEWAYS), using higher timeframes or existing metrics.

6. **Compute liquidity & volume fields**
   - `avg_volume_first_30m`:
     - mean volume over bars in first N minutes.
   - `volume_spike_flag`:
     - boolean if bar volume exceeds a configured multiple of baseline.
   - `liquidity_regime`:
     - classify as NORMAL / THIN / DISTORTED via volume + spread proxies.

7. **Apply news flags (config-driven)**
   - Lookup the news calendar for the session date:
     - set `has_major_news_today` true if there is a known event,
     - `news_window` based on event time relative to RTH,
     - `news_label` (CPI / FOMC / NFP / etc.).
   - No external API calls; purely table/config-driven.

8. **Set session quality / skip metadata**
   - `session_quality_flag`:
     - `OK` if data is complete and regimes look valid,
     - `AVOID` if:
       - ATR too low (dead session),
       - OR width too extreme,
       - severe data gaps,
       - news flagged for avoidance.
     - `ERROR` if:
       - required bars missing,
       - computations fail.
   - `session_skip_reason`:
     - machine-readable codes like `LOW_ATR`, `OR_TOO_WIDE`, `NEWS_LOCKOUT`, `BAD_DATA`.

9. **Persist**
   - Upsert pattern:
     - If a `session_metrics` row already exists for (`symbol`, `session_date`, `session_type`), update it.
     - Otherwise, insert a new row.
   - Respect unique constraint on (`symbol`, `session_date`, `session_type`).


## 5. Error handling & observability

The population job should:

- Log structured events when:
  - a session is processed,
  - metrics are computed successfully,
  - data issues are detected (missing bars, outliers),
  - the job decides to flag `session_quality_flag = AVOID` or `ERROR`.

Typical logging fields:

- `strategy_id = null` (engine-level),
- `symbol`, `session_date`, `session_type`,
- `event_type = SESSION_METRICS_COMPUTED` or `SESSION_METRICS_FAILED`,
- diagnostic fields (`vol_regime`, `liquidity_regime`, `news_label`, `session_skip_reason`).

On failure:

- The job should:
  - set `session_quality_flag = ERROR`,
  - store a `session_skip_reason`,
  - avoid throwing away the row entirely, so strategies and reports can see that the session was problematic.


## 6. Golden Days & testing

Golden Day L3 replay will re-use the same population logic:

- Input:
  - bar fixtures for specific past dates/symbols stored in test fixtures.
- Process:
  - run the SessionMetrics population code against those fixtures (in memory or against a test DB).
- Assertions:
  - a single `session_metrics` row exists per Golden Day symbol/session,
  - key fields match expected values:
    - ATR bucket, vol_regime, OR width, OR/ATR ratio,
    - VWAP slope and price_vs_vwap_at_or_end,
    - liquidity_regime,
    - news flags (where applicable).

This ensures that refactors do not silently change the behaviour of SessionMetrics in ways that break strategy logic or risk filters.


## 7. Non-goals (for this step)

- No live wiring or code changes yet.
- No immediate requirement for incremental / intraday updates.
- No dependency on real news APIs or external data sources (config is enough).
- No changes to existing ORR / strategy execution behaviour until a later phase.

This doc is a design contract for how the future implementation of SessionMetrics population should work.
