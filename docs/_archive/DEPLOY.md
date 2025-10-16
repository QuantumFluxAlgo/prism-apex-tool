# One-Go Docker Deploy

## Prerequisites
- Docker Desktop (or Docker Engine + Compose V2)
- No process listening on host ports **3000** (API) and **8080** (Dashboard)

## Quick start
```bash
# From repo root
make up
# or explicitly:
docker compose -f docker-compose.yml up -d --build
```

**Dashboard** → http://localhost:8080

**API** (health, if implemented) → http://localhost:3000/health

## What it does
- Builds the workspace with PNPM in a multi-stage Dockerfile
- Produces two images:
  - **api** (Node 20) on port 3000
  - **dashboard** (Nginx) on port 8080, proxying `/api/*` to `api:3000`
- No secrets are committed. Copy `.env.template` to `.env` and fill in real values as needed.

## Useful commands
```
make logs     # tail logs
make ps       # container status
make down     # stop stack
make build    # rebuild images (no cache)
```

## Troubleshooting
- **Port already in use (3000/8080)** → stop the conflicting process or container (`docker ps` then `docker stop <id>`).
- **Build fails on dashboard** → ensure TypeScript DOM libs/shims are present; run `pnpm -C apps/dashboard build` locally to check.
- **Health endpoint** → If `/health` is not implemented, either add one in the API or adjust/remove the healthcheck.

## Gapfill maintenance (1-minute bars)
- One-shot: `make gapfill` (fetches only missing minutes in the last 30 days; duplicate-safe).
- Nightly: `gapfill-cron` service runs at **02:20 UTC (GMT)** and writes logs to `/var/log/gapfill-cron.log`.

Verify:
```bash
docker compose -f docker-compose.yml -f docker-compose.db.yml up -d gapfill-cron
docker compose -f docker-compose.yml -f docker-compose.db.yml logs --tail=20 gapfill-cron
```

