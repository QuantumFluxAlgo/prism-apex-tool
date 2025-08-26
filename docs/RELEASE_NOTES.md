# Prism Apex Tool — Release Notes

## v0.1.0 (Unquarantine milestone)

### Highlights

- **API** restored on Fastify 5 with typed routes and OpenAPI 3.1 generator.
- **Strategies**: Open Session Breakout, VWAP First-Touch (read-only suggestions).
- **Tickets**: `POST /tickets/promote`, `GET /tickets?date=YYYY-MM-DD`, CSV export.
- **Security**: optional Bearer auth; local rate-limit with public route bypasses; `/ready`.
- **DX**: SDK package for typed client calls; per-pkg typecheck; Vitest harness; Docker (dev + prod).
- **Docs**: README overhaul, upgrade guide, release notes.

### Breaking / Behavioral

- Node **20.x** required; ESM everywhere.
- Bearer auth **off by default**; enable via `BEARER_TOKEN` (public: `/health`, `/ready`, `/openapi.json`, `/version`).
- Rate-limit defaults: `RATE_LIMIT_MAX=60`, `RATE_LIMIT_WINDOW_MS=60000`, `RATE_LIMIT_MAX_BUCKETS=50000`.

### New Endpoints

- `GET /ready` — readiness probe.
- `GET /market/symbols`, `GET /market/sessions`
- `POST /signals/osb`, `POST /signals/vwap-first-touch`
- `POST /tickets/promote`, `GET /tickets?date=YYYY-MM-DD`
- `GET /export/tickets?date=YYYY-MM-DD`

### Tooling & Tests

- Per-workspace typecheck via `tsconfig.typecheck.json`.
- Global Vitest setup resets modules and quiets logs.
- Docker Compose for dev; multi-stage production Dockerfile.

### Known Gaps

- No auto-execution of orders (by design).
- No external email/Slack integrations (local-only for now).
