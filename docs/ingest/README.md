# Prism Apex Yahoo Ingest Runbook (EPIC 0)

This runbook explains how to operate the existing Yahoo ingest tools so EPIC 0's goals—idempotent, session-aware bars feeding SessionMetrics and Worklist—can be met without inventing new pipelines.

## Background

EPIC 0 focuses on stability of the Yahoo 1m ingest. The current repo already contains the pieces we reuse:

- `apps/ingest/src/backfill.ts` — fetches Yahoo chart windows for a symbol/date range, deduplicates bars in memory, and upserts into `bars_1m` via `ON CONFLICT (symbol, ts_utc)` so reruns are safe.
- `apps/ingest/src/gapfill.ts` — scans `bars_1m` for 1-minute gaps per symbol and re-queries Yahoo to refill missing bars (also using `ON CONFLICT`).
- `apps/ingress-yahoo-dev/src/server.ts` — an HTTP ingress server for dev/demos that accepts POST `/ingress/yahoo/v1/bar` payloads, writes JSONL caches, derives AVWAP/guardrails, and can emit mock tickets.

EPIC 0 requires us to formalise *how* to run these components, document prerequisites, and ensure operators (or scripts) can re-run ingest for any symbol/session without corrupting data.

## Components & Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `apps/ingest/src/backfill.ts` | Bulk backfill of historical data for `YAHOO_SYMBOLS` (defaults include ES=F, NQ=F, etc.) across a `YAHOO_RANGE`. Fetches in ≤6-day windows, dedupes, and upserts into Postgres.
| `apps/ingest/src/gapfill.ts` | Detects missing 1-minute bars within the last 29 days per symbol, or for an explicit window, and refills from Yahoo with UPSERT semantics.
| `apps/ingress-yahoo-dev/src/server.ts` | Express server for manual ingress/testing. Validates payloads, dedupes JSONL caches, updates AVWAP state, applies sizing/guardrails, and can emit tickets for demo purposes. Controlled via env (e.g., `APEX_ENABLE_YAHOO_INGRESS=true`).

## Cadence & Freshness Budget

| Stage | Current behaviour | Target budget | Notes / knobs |
|-------|-------------------|---------------|---------------|
| Yahoo ingest job (`apps/api` → `pnpm --filter @prism-apex/ingest backfill`) | Disabled until `INGEST_YAHOO_SYMBOLS` is set; when enabled it ran every 60 s and re-read the entire `YAHOO_RANGE` (default 30 d). | Fetch the most recent 15–20 minutes of bars every ≤45 s. | The scheduler now honours `YAHOO_POLL_INTERVAL_MS` (fallback 45 000 ms) and `YAHOO_POLL_LOOKBACK_MINUTES` (fallback 90) before launching the CLI. Override them in `.env` to tune cadence without touching code. |
| Gapfill cron (`gapfill-cron` service) | Hard-coded to run `apps/ingest/dist/gapfill.js` daily at 02:20 UTC. | ≥1× per day to repair gaps, plus ad-hoc runs. | Continue to use the cron container for daily maintenance; run `scripts/ingest/run-gapfill.sh` for targeted repairs. |
| Session metrics | Calculated on-demand when Worklist/Tickets request data (`createSessionMetricsService` reads the latest `bars_1m`). | <5 s after new bars arrive. | Because metrics compute synchronously at read time, freshness equals the ingest lag. |
| Worklist/Tickets dashboards | Read canonical tickets + session metrics directly from the API. | Tickets should see <2 min total lag (ingest + guardrails). | Use `/health/yahoo` to verify ingest lag stays below the `YAHOO_OK_LAG_MIN` threshold (25 min by default). |

**Environment presets (drop these in `.env` or compose overrides):**

| Deployment | `YAHOO_POLL_INTERVAL_MS` | `YAHOO_POLL_LOOKBACK_MINUTES` | Rationale |
|------------|-------------------------|-------------------------------|-----------|
| SIM / local dev | `90000` (90 s) | `90` | Gentler cadence for laptops while still replaying 90 min of data when charts stall. |
| PROD / staging | `45000` (45 s default) | `20` | Poll halfway through each minute and only re-fetch the last ~20 minutes so bars land <15 s after Yahoo posts them. |

Set `INGEST_YAHOO_SYMBOLS="ES=F,MES=F,..."` whenever you want the scheduler to run; otherwise it stays idle and only the daily gapfill writes bars.

## Prerequisites

- **Docker / Postgres**: Run the repo’s docker compose (`make up` or equivalent) so Postgres is reachable via `postgres://apex:apex@db:5432/prismapex` (default in the scripts). Ensure the database has the `bars_1m` table.
- **Node 20 + pnpm**: The wrappers below call `pnpm` scripts; ensure dependencies are installed (`pnpm install`).
- **Environment**:
  - `DATABASE_URL` (defaults to docker Postgres).
  - `YAHOO_SYMBOLS`, `YAHOO_RANGE`, `YAHOO_INTERVAL` — optional overrides consumed by `backfill.ts`/`gapfill.ts`.
  - `WINDOW_FROM` / `WINDOW_TO` (ISO timestamps) — optional envs for `gapfill.ts` to target a specific window.
  - `APEX_ENABLE_YAHOO_INGRESS`, `APEX_YAHOO_SHARED_SECRET`, and sizing/risk env vars for ingress server (see `apps/ingress-yahoo-dev/src/server.ts`).

## How to Run

Use the helper scripts under `scripts/ingest` (added in this step) or run pnpm directly.

### Backfill a Specific Symbol Window

```
./scripts/ingest/run-backfill.sh ES=F 2024-01-01 2024-01-05
```

This wrapper sets `YAHOO_SYMBOLS` to the provided symbol and runs `pnpm --filter @prism-apex/ingest backfill` with `WINDOW_FROM/WINDOW_TO`. The underlying script fetches Yahoo windows, dedupes per timestamp, and upserts into `bars_1m`.

### Gapfill a Window (or Last 29 Days)

```
./scripts/ingest/run-gapfill.sh ES=F 2024-01-01 2024-01-05
```

If dates are provided, the script sets `WINDOW_FROM/WINDOW_TO` so only that range is refilled. Without dates, `gapfill.ts` scans the last 29 days for missing minutes and refills automatically. UPSERT ensures reruns stay idempotent.

### Start Dev Ingress Server

```
./scripts/ingest/run-ingress-dev.sh
```

This runs `pnpm --filter @prism-apex/ingress-yahoo-dev start`, which launches the Express webhook on the configured port (see package.json). Use this for manual POSTs or to replay JSONL fixtures into the strategy pipeline.

## Idempotency & Safety Notes

- Both backfill and gapfill write via `INSERT ... ON CONFLICT (symbol, ts_utc) DO UPDATE` so re-running the same window only updates changed bars and never duplicates rows.
- `fetchWindow` dedupes by ISO timestamp before writing; combined with UPSERT, this satisfies EPIC 0’s “rerun without corruption” requirement.
- Ingress server appends JSONL but guards risk resets per day and enforces news blackout/guardrails; running it with the same payload multiple times is safe as long as the downstream consumer dedupes tickets (a future step).

## Health & Telemetry

- `curl -fsS http://localhost:3000/health/yahoo` returns the latest bar timestamp per symbol plus lag minutes. CI uses the same signal; keep ingest jobs running until the summary reports `status: "ok"` with lag < `YAHOO_OK_LAG_MIN` (25 min by default).
- When tuning cadence, watch the API logs for `[yahoo-ingest-manual] completed …` and confirm runs complete within the poll interval (use `YAHOO_POLL_LOOKBACK_MINUTES` to keep the fetch window small enough).

## How This Supports EPIC 0

EPIC 0 requires a documented, repeatable flow for bar ingestion so that SessionMetrics, strategies, and Worklist have reliable data. These commands provide:

- A single source of truth for historical backfills.
- A gap-remediation tool to keep bars clean.
- A dev ingress path for experimenting with live/delayed feeds.

Future EPIC 0 steps will wire these commands into scheduler jobs and add telemetry, but operators can already rerun ingest confidently using this runbook.
