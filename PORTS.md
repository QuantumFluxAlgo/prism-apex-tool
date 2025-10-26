# Canonical Ports (Local & Compose)

| Surface              | Port | Notes                                                 |
|----------------------|------|-------------------------------------------------------|
| API (DB mode)        | 3000 | Fastify with DATABASE_URL / compose `api` service (DB mode) |
| API (mock mode)      | 8000 | Fastify dev server via `scripts/local-up.sh`          |
| Dashboard (dev/Vite) | 5173 | Vite dev helper (`scripts/dev-web-8000.sh`)           |
| Dashboard (prod)     | 5180 | Nginx compose service (e.g., `dashboard-full`)        |
| Postgres (host)      | 55433| Compose `db:5432` mapped to host                      |

Use `tools/guards/ports-check.sh` to detect non-canonical port literals.
