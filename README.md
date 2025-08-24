# Prism Apex Tool

Prism Apex Tool is a TypeScript monorepo supporting discretionary futures trading on Apex accounts. The system generates strategy tickets while a human operator manually enters orders into Tradovate.

## MVP Scope

- Strategies: **Open Session Breakout** and **VWAP First-Touch** for ES, NQ, MES and MNQ contracts.
- System suggests trades; the operator confirms and inputs orders manually.
- Absolutely no automatic order execution.

## Apex Guardrails (Non‑negotiable)

- Every trade requires a stop.
- Trailing drawdown protection enforced.
- Trade at half size until buffer is built.
- Daily profit share limited to ≤30%.
- Flat by end of day at **20:59 GMT**.

## Repository Structure

```
apps/
  api/            Fastify or Express API (future)
  dashboard/      React dashboard (future)
packages/
  shared/         Shared utilities (future)
  rules-apex/     Apex rule enforcement (future)
  signals/        Strategy signal generators (future)
  clients-tradovate/ Tradovate client adapters (future)
infra/            Deployment and runtime infrastructure (placeholder)
tests/            Integration and end-to-end tests (future)
```

## Local Setup

- Requires Node 20.x (`.nvmrc` / `.node-version`)
- Install: `pnpm install`
- Validate: `pnpm run validate`
- Versions: `pnpm run versions`

## PR Roadmap (Collapsed)

- PR‑00 Repo scan & dependency sanity
- PR‑01a API TypeScript baseline
- PR‑01b API entrypoint & start
- PR‑01c API smoke routes
- PR‑02 Ports & process
- PR‑03 Tests baseline
- PR‑04 Lint/format CI
- PR‑05 Typecheck CI
- PR‑06 Dead code cleanup
- PR‑07 Docs upkeep
- PR‑08 Strategies wiring check

## Unquarantine Phase 1

Restored:

- Read-only `/health` and `/version` API routes
- `@prism-apex-tool/reporting` utilities with a no-op email adapter

Deferred:

- Any write-side endpoints, jobs, or external integrations
- Real email delivery (stubbed for now)

Smoke tests cover `/health`, `/version`, and reporting utilities.

## Unquarantine Phase 2

Restored:

- `@prism-apex-tool/analytics` helpers for summaries and payout status
- `@prism-apex-tool/audit` log readers
- Read-only `/analytics/summary` and `/audit/last` API routes

Deferred:

- Persisting reports or payout status
- Audit log writes and notifications

Run tests:

- `pnpm --filter @prism-apex-tool/analytics test`
- `pnpm --filter @prism-apex-tool/audit test`
- `pnpm --filter ./apps/api test`

## Unquarantine Phase 3

- API typecheck stabilized; placeholders added where implementations are pending.
- Packages now include minimal ESLint configs.
- No jobs/strategies enabled.

## Unquarantine Phase 4

Restored:

- Local filesystem-backed API routes:
  - `GET /report/daily?date=YYYY-MM-DD`
  - `POST /ingest/alert`
  - `GET /alerts/peek?limit=50`
- `POST /alerts/ack`
- `POST /notify/recipients`
- `GET /export/tickets?date=YYYY-MM-DD`
- `POST /rules/check`
- All persistence remains local-only under `DATA_DIR`.

Run tests:

- `pnpm --filter ./apps/api typecheck`
- `pnpm --filter ./apps/api test`

## Unquarantine Phase 5

- Restored in-process scheduler with deterministic, safe jobs.
- Jobs and intervals:
  - `EOD_FLAT` – every 60s
  - `MISSING_BRACKETS` – every 15s
  - `DAILY_LOSS` – every 60s
  - `CONSISTENCY` – every 300s
- Endpoints:
  - `GET /jobs/status` – job visibility
- `POST /jobs/run/:name` – manual trigger for tests/dev
- Scheduler remains local-only with filesystem-backed store.

## Unquarantine Phase 6

Restored:

- `@prism-apex-tool/signals` package with read-only strategies (Open Session Breakout, VWAP First-Touch).
- Read-only API routes:
  - `POST /signals/osb`
  - `POST /signals/vwap-first-touch`
  - `GET /market/symbols`
  - `GET /market/sessions`
  - `GET /signals/ping`

Example `POST /signals/osb`:

```json
{
  "symbol": "ES",
  "session": "RTH",
  "bars": [{ "ts": "2020-01-01T00:00:00Z", "open": 100, "high": 105, "low": 95, "close": 100 }, ...]
}
```

Response:

```json
{
  "suggestions": [
    {
      "id": "osb-2020-01-01T00:10:00Z",
      "symbol": "ES",
      "side": "BUY",
      "qty": 1,
      "entry": 106,
      "stop": 94,
      "targets": [111],
      "reasons": ["OSB breakout"]
    }
  ]
}
```

Example `POST /signals/vwap-first-touch`:

```json
{
  "symbol": "ES",
  "bars": [{ "ts": "2020-01-01T01:00:00Z", "open": 1, "high": 2, "low": 1, "close": 1, "volume": 1 }, ...]
}
```

Response:

```json
{
  "suggestions": [
    {
      "id": "vwapft-2020-01-01T01:10:00Z",
      "symbol": "ES",
      "side": "BUY",
      "qty": 1,
      "entry": 2,
      "stop": 0,
      "targets": [7],
      "reasons": ["VWAP first touch"]
    }
  ]
}
```

These endpoints only compute and return suggested tickets; operators still manually enter orders.

Run tests:

- `pnpm --filter @prism-apex-tool/signals typecheck`
- `pnpm --filter @prism-apex-tool/signals test`
- `pnpm --filter ./apps/api typecheck`
- `pnpm --filter ./apps/api test`

## Unquarantine Phase 8C — Tickets (local-only)

- Added `POST /tickets/promote` to persist a suggestion as a ticket in the local filesystem store.
- Added `GET /tickets?date=YYYY-MM-DD` to list tickets for a given day.
- Export and report flows pick up these tickets automatically.
- No external integrations; purely local.

## Auth (optional, default OFF)

Set `BEARER_TOKEN` to enable bearer auth across the API (read-only endpoints included).
Public endpoints that remain open:

- `GET /health`
- `GET /openapi.json`
- `GET /version`

Example:

```bash
export BEARER_TOKEN="change-me"
curl -H "Authorization: Bearer $BEARER_TOKEN" http://localhost:PORT/market/symbols
```

## Security & Hardening (PR-13)

### Readiness probe

`GET /ready` → `{"ok": true, "ready": true}`
Intended for containers/orchestrators to confirm the API is up.

### Bearer auth (optional, default OFF)

Set `BEARER_TOKEN` to require `Authorization: Bearer <token>` on all non-public routes.
Public routes: `/health`, `/ready`, `/openapi.json`, `/version`.
Example:

```bash
export BEARER_TOKEN="change-me"
curl -H "Authorization: Bearer $BEARER_TOKEN" http://localhost:PORT/market/symbols
```

### Local rate limit (no external deps)

Per-IP, per-route limiting (excludes public routes & CORS preflight).

- `RATE_LIMIT_MAX` (default: `60`)
- `RATE_LIMIT_WINDOW_MS` (default: `60000`)

Example 429 behavior (three quick requests with `RATE_LIMIT_MAX=2`):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/market/symbols  # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/market/symbols  # 200
curl -s -i http://localhost:PORT/market/symbols | sed -n '1,10p'              # HTTP/1.1 429 ...
```

### CORS

CORS is enabled (`@fastify/cors` with `origin: true`); responses include `Access-Control-Allow-Origin`.
