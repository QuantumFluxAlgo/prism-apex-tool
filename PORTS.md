# Canonical Ports (Local & Compose)

| Surface              | Port | Notes                                                 |
|----------------------|------|-------------------------------------------------------|
| API (DB mode)        | 3000 | Fastify with DATABASE_URL / compose `api` service      |
| API (mock mode)      | 8000 | Fastify dev server via `scripts/local-up.sh`          |
| Dashboard (dev/Vite) | 5173 | Vite dev helper (`scripts/dev-web-8000.sh`)           |
| Dashboard (prod)     | 5180 | Nginx compose service (dashboards)                    |
| Postgres (host)      | 55433| Host port mapped from compose `db:5432`               |

## Guardrail

Only reference the host ports above directly; everything else should flow through environment variables. Run `tools/guards/ports-check.sh` to detect drift.
