# Prism-Apex – Phase 1 Data Model

## 1. Purpose & Scope

Phase 1 – **Data & Metrics Foundations** delivers a reliable SessionMetrics/flags pipeline that
feeds operator-facing surfaces (Tickets, Worklist, dashboards) without touching live strategy
logic. This document explains the Phase 1 data artefacts:

- Session definitions and keys.
- Computed **SessionMetrics** per (symbol, sessionDateUtc).
- **Golden Day** fixtures and replay harness.
- **Session flags** (news/FOMC/roll/etc.).
- How these flow into the Tickets API and dashboard, plus how to extend them safely.

---

## 2. Sessions & Keys

Every Phase 1 metric is anchored to a **session key**:

| Field            | Description                                |
| ---------------- | ------------------------------------------ |
| `symbol`         | Futures/root symbol (e.g., `ES`, `NQ`, etc.) |
| `sessionDateUtc` | UTC-calibrated trading date (`YYYY-MM-DD`)  |

- Tickets rows carry `session_date_utc` or a derivable date (from `opened_at_utc`).
- SessionMetrics services, Golden Day fixtures, and SessionFlags all use this key.
- Helpers should reconstruct missing session dates by slicing the UTC timestamp (`opened_at_utc.slice(0, 10)`).

---

## 3. SessionMetrics

### 3.1 Source & runtime

- **Input:** 1-minute bars from the ingestion pipeline (postgres `bars_1m` or equivalent).
- **Service:** `apps/api/src/jobs/session-metrics/` (runtime, service, populate job).
- **Call surface:** `createSessionMetricsService().getForSymbolSession({ symbol, sessionDate })`
  returns a `SessionMetricsDto`.
- **Batch helper:** `fetchSessionMetricsBatch` deduplicates keys and fetches summaries for Tickets.
- **Validation:** Golden Day replay harness and vitest suites (`replay.test.ts`, `populate-session-metrics.test.ts`).

### 3.2 Conceptual fields

| Category         | Fields / meaning                                                                                     |
|------------------|-------------------------------------------------------------------------------------------------------|
| Identity         | `symbol`, `sessionDateUtc`                                                                            |
| Opening Range    | `orHigh`, `orLow`, `orWidth`, `orDurationMinutes`                                                     |
| Volatility       | `atr` (session ATR), `orToAtrRatio = orWidth / atr`                                                   |
| VWAP context     | `vwapSlopeClassification` (“UP”, “DOWN”, “FLAT”), optional VWAP-derived regimes                       |
| Session stats    | Session high/low/close, composite ranges (used for future strategy analytics)                        |

- The Tickets API emits a *summary* (status, `orWidth`, `orToAtrRatio`, `vwapSlopeClassification`).
- Additional fields can be added later, but UI surfaces should stay compact.

### 3.3 Tickets integration

1. Tickets API queries base ticket rows from Postgres.
2. `populateSessionMetricsForTickets` collects `(symbol, sessionDate)` pairs, capped by
   `DEFAULT_MAX_SESSION_METRICS_KEYS`.
3. `fetchSessionMetricsBatch` loads summaries and attaches them as `ticket.sessionMetrics`.
4. Dashboard Tickets page renders a “Session” column: `OR width`, `R:ATR`, `VWAP slope`.

---

## 4. Golden Day Fixtures & Replay

### 4.1 Purpose

Golden Days provide deterministic fixtures for:

- Regression testing the SessionMetrics job.
- Demonstrating metrics to operators (ex: “see ES_2025-01-15”).
- Future strategy simulations without hitting live data.

### 4.2 Layout

- Directory: `apps/api/src/jobs/session-metrics/golden-days/`
- Files:
  - `README.md` – usage and naming reference.
  - `ES_2025-01-15.json` – canonical example.
  - `fixtures.example.json` – optional aggregated listings.
  - `replay.ts` / `replay.test.ts` – golden-day harness + tests.
- Naming: `<SYMBOL>_<SESSION_DATE>.json` (UTC date). Example: `ES_2025-01-15.json`.
- JSON structure:

```jsonc
{
  "symbol": "ES",
  "sessionDate": "2025-01-15",
  "timezone": "America/Chicago",
  "bars1m": [
    { "timestamp": "2025-01-15T14:30:00Z", "open": 100, "high": 101, "low": 99.5, "close": 100.5, "volume": 1234 }
    // ...
  ],
  "expectedSessionMetrics": {
    "orWidth": 12.5,
    "orToAtrRatio": 0.85,
    "vwapSlopeClassification": "UP"
  }
}
```

### 4.3 Replay harness

- `replayGoldenDayWithService(fixture, service)` keeps replay deterministic and injectable.
- Harness accepts any implementation of `SessionMetricsService`.
- Tests exercise the harness with a fake service (no DB requirements).
- Operators/devs can reference these fixtures when explaining metrics or debugging.

---

## 5. Session Flags

### 5.1 Config model

- Config file: `apps/api/src/config/session-flags.ts`
- Service: `apps/api/src/jobs/session-metrics/session-flags-service.ts`
- Types:
  - `SessionFlag` enum (API) ↔ string union on dashboard (`'NEWS' | 'FOMC' | 'ROLL' | 'HOLIDAY' | 'OTHER'`).
  - `SessionFlagConfigEntry` – `symbolPattern`, `sessionDate`, `flags[]`, `note?`.
- Matching logic:
  - `symbolPattern` supports exact match (`"ES"`) and prefix wildcard (`"ES*"`).
  - Config stays in memory but can be externalised (JSON/YAML) later.

### 5.2 SessionFlagsService

```ts
export type SessionFlagsSummary = {
  flags: SessionFlag[];
  hasNewsFlag: boolean; // true if NEWS or FOMC present
};

const service = createSessionFlagsService();
service.getFlagsForSession(symbol, sessionDate);
```

- Aggregates all matching config entries.
- `hasNewsFlag` is used for operator alerts; NEWS + FOMC count as “news”.

### 5.3 Consumers

| Layer            | Usage                                                                                                   |
|------------------|---------------------------------------------------------------------------------------------------------|
| Tickets API      | Attaches `sessionFlags` per ticket alongside `sessionMetrics`. Pure config lookup; no extra DB calls.   |
| Dashboard API    | `TicketRow.sessionFlags?: SessionFlagsSummary` typed in `apps/dashboard/src/lib/api.ts`.                 |
| Tickets UI       | Session column shows metrics and, when `hasNewsFlag` is true, a small “News” chip stacked under them.   |
| Worklist UI      | Currently minimal; uses same DTO so future chips can be added without API work.                         |

---

## 6. End-to-End Flow

```
1. Ingestion        : Bars (1m) stored per symbol.
2. SessionMetrics   : Service computes OR/ATR/VWAP metrics per (symbol, sessionDate).
3. Golden Day tests : Fixtures replayed via harness to validate metrics.
4. Session flags    : In-memory config tags sessions with NEWS/FOMC/etc.
5. Tickets API      : Batch-attaches sessionMetrics + sessionFlags to ticket DTOs.
6. Dashboard UI     : Renders Session column (metrics + News chip) and consumes summaries safely.
```

- The flow is intentionally **read-only** for dashboards/OPS; strategies still receive metrics separately.
- All key services live in `apps/api/src/jobs/session-metrics/` to keep concerns together.
- Tickets API is the authoritative DTO surface for both dashboards and future operator tools.

---

## 7. Extensibility Guidelines

| Area            | How to extend                                                                                                      |
|-----------------|--------------------------------------------------------------------------------------------------------------------|
| SessionMetrics  | Add fields in runtime/service → update summaries/DTOs intentionally → document the change here.                    |
| Session flags   | Add enum values + config entries → decide whether they count toward `hasNewsFlag`.                                 |
| Golden Days     | Add new `<SYMBOL>_<DATE>.json` fixtures → replay via tests or docs to keep coverage broad.                          |
| Tickets/Dashboard | Opt-in UI chips/badges should live near the Session column; keep per-ticket fetch paths untouched (no new queries). |

Always update this document when introducing new metrics or flags so future Phase 2/3 work can trust the data layer.

## 8. Phase 2+ Consumers

Phase 2 and beyond consume Phase 1 data through a small number of well-defined interfaces:

- **OrchestratorContext**
  - Contains the core Phase 1 artefacts:
    - `symbol`, `sessionDateUtc`
    - `sessionMetrics` summary (OR width, OR:ATR ratio, VWAP slope, and related context)
    - `sessionFlags` summary (`flags[]`, `hasNewsFlag`)
  - Future fields (e.g., regime tags, lightweight risk snapshots) may be added, but the SessionMetrics/flags contract remains stable.

- **Strategy layer**
  - Each strategy (ORR, VWAP First Touch, OSB) reads SessionMetrics and SessionFlags from the context to decide:
    - Whether a session is tradable.
    - Directional bias and structure (entry/stop/target ideas).
    - When to stand aside (e.g., NEWS/FOMC, ill-formed OR, extreme volatility).

- **Risk engine**
  - Uses SessionFlags (and later risk snapshots) to enforce:
    - News/no-trade windows.
    - Per-session and per-strategy caps.
    - Simple Apex-style constraints.

- **Worklist & Tickets**
  - Worklist v2 and Ticket Draft flows remain consumers of the Phase 1 DTOs:
    - They never recompute metrics.
    - They rely on the orchestrator output plus risk decisions layered over the existing SessionMetrics/flags summaries.

When extending Phase 2+ logic, prefer adding new, explicit fields to the orchestrator context and DTOs rather than mutating Phase 1 semantics in-place. This keeps the data layer trustworthy for both strategy and operator tooling.
