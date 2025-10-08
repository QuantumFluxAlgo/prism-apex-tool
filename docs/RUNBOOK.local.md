# Prism-Apex — Local Runbook (Minimal)

## Prereqs
- Node 20.x (use `.nvmrc`)
- Docker + Docker Compose
- pnpm 9+

## Install
```bash
nvm use 20
pnpm install
```

## Ports
Set free ports to avoid conflicts:
```bash
export POSTGRES_PORT=55434
export API_PORT=3001
```

## Start services
```bash
# Database
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d db
# API (tickets-only)
docker compose up -d api
# Health check
curl -sf http://localhost:$API_PORT/health
```

## Dashboard (optional)
```bash
docker compose -f docker-compose.dashboard.yml up -d
# open http://localhost:5180
```

## Notes
- Tickets-only: any trading calls fence with `ORDERS_DISABLED`.
- Data source: Yahoo Finance native (`query1.finance.yahoo.com`), ~15m delayed.
- If a port is taken, set another `POSTGRES_PORT` or `API_PORT` and restart.
