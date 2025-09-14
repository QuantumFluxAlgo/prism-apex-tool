# Prism-Apex Dashboard Lite

Read-only viewer for JSONL tickets under `tickets/YYYY-MM-DD/*.json`.

## Dev

```bash
# Terminal A: start the server (API + static host)
pnpm -w -C apps/dashboard-lite dev

# Terminal B: start the web (vite dev)
pnpm -w -C apps/dashboard-lite --silent exec vite --config web/vite.config.ts
# open http://localhost:5179 and it will call the API on 5178

Build & Run (Docker)
docker build -t prism-apex:dashboard-lite -f apps/dashboard-lite/Dockerfile .
docker compose -f docker-compose.yml -f docker-compose.dashboard-lite.override.yml up -d
# Dashboard Lite: http://localhost:5178
# API: http://localhost:3000
# or use helper script
./scripts/smoke_deploy.sh
# tear down
docker compose down

API

GET /api/tickets?date=YYYY-MM-DD&strategy=APX-DDB-01

Reads from tickets/<date>/*.json, filters by strategy if provided.
```
