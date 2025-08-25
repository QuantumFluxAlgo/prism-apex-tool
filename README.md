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

## Developer Guide

### Tests & Typecheck (PR-15)

- Run all package tests: `pnpm test`
- Typecheck all packages (source only, tests excluded): `pnpm typecheck`

Each package owns its own `tsconfig.typecheck.json` so CI stays fast and focused:

- Tests are compiled by Vitest at runtime (not by `tsc`).
- `@ts-expect-error` in test files won’t fail `pnpm typecheck` anymore.

### Test harness (PR-17)

Vitest now loads a small setup file for the API tests:

- resets loaded modules before each test (`vi.resetModules()`), avoiding job double-registration
- forces quiet logs with `LOG_LEVEL=fatal` unless a test overrides it
- leaves rate-limiter/auth env vars untouched unless a test sets them

You can still override in a test:

```ts
process.env.LOG_LEVEL = 'info';
```

### Run the API with Docker (PR-18)

If you don’t want to install Node/pnpm locally:

1. Copy `.env.example` → `.env` and set any values you need (optional).
2. Start the API:
   ```bash
   pnpm compose:up
   ```

Hit it:

- Health: GET http://localhost:3000/health
- OpenAPI: GET http://localhost:3000/openapi.json
- Symbols: GET http://localhost:3000/market/symbols

Notes:

- Container builds & runs all workspaces it needs, then starts the API (`pnpm --filter ./apps/api start`).
- Data is persisted in the api-data volume at /data (inside the container).
- To stop & clean up:
  ```bash
  pnpm compose:down
  ```
  (You already have `compose:up` and `compose:down` scripts at the root; this will use them.)

### Build a production Docker image (PR-18b)

Build the image:

```bash
pnpm docker:build
```

Run it:

# optional: export BEARER_TOKEN to require auth

# export BEARER_TOKEN="change-me"

docker run --rm \
 -p 3000:3000 \
 -e LOG_LEVEL=info \
 -e TRUST_PROXY=true \
 -e BEARER_TOKEN="${BEARER_TOKEN:-}" \
 -v api-data:/data \
 prism-apex-api:latest

Probe it:

Health: GET http://localhost:3000/health

Ready: GET http://localhost:3000/ready

OpenAPI: GET http://localhost:3000/openapi.json

Notes:

Multi-stage build compiles all workspaces, then pnpm prune --prod strips dev deps.

The final image includes apps/api/dist plus compiled workspace packages (e.g. packages/reporting, packages/signals) required by the API at runtime.

Data lives in the api-data volume at /data inside the container.

## Why this works

- **Workspace-aware**: we build the whole monorepo, then copy `dist/` outputs and a **pruned** `node_modules` that still resolves workspace deps (via pnpm’s virtual store/symlinks).
- **Small & safe**: dev deps are removed (`pnpm prune --prod`), only runtime assets ship.
- **No rebuild in runner**: final stage just runs `node apps/api/dist/index.js`.

## Quick verification (no tests required)

```bash
pnpm docker:build
docker run --rm -p 3000:3000 -v api-data:/data prism-apex-api:latest
# In another shell:
curl http://localhost:3000/health
curl http://localhost:3000/openapi.json | jq '.info.title, .paths | keys | length'
```

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
- `RATE_LIMIT_MAX_BUCKETS` (default: `50000`)

Set `TRUST_PROXY=true` when running behind a reverse proxy (X-Forwarded-\*).

Example 429 behavior (three quick requests with `RATE_LIMIT_MAX=2`):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/market/symbols  # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/market/symbols  # 200
curl -s -i http://localhost:PORT/market/symbols | sed -n '1,10p'              # HTTP/1.1 429 ...
```

### CORS

CORS is enabled (`@fastify/cors` with `origin: true`); responses include `Access-Control-Allow-Origin`.
