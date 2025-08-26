# Local Development & Production Parity

## Dev (two terminals)
- **API** (Terminal A):
  ```bash
  ./dev_api.sh
  # http://localhost:8000/health -> {"ok":true}
  ```

Dashboard (Terminal B):

```bash
./dev_dashboard.sh
# http://localhost:3000
```

Seed demo data (optional):

```bash
./seed_demo.sh
```

Production-like (Docker)

Build and run both services locally like prod:

```bash
docker compose build
docker compose up
```

Dashboard: http://localhost:8080

API: http://localhost:8000

Data persists in api-data volume at /var/lib/prism-apex-tool inside the API container.

Rebuild only one service
```bash
docker compose build api && docker compose up -d api
docker compose build dashboard && docker compose up -d dashboard
```

Logs
```bash
docker compose logs -f api
docker compose logs -f dashboard
```

Tear down
```bash
docker compose down -v
```

Notes / Gotchas

API build uses tsup (CJS output). Dev continues to use tsx.

Dashboard is static and served by nginx. nginx.conf should proxy /api/* to http://api:8000 (container hostname).

If you change ports, also update:

Vite proxy (dev): apps/dashboard/vite.config.ts

Compose port mappings (prod-like): docker-compose.yml

If your UI references monorepo packages, ensure they’re copied in Docker build context (we already copy packages/).

## Tests

```bash
pnpm -r build         # builds packages (emits .d.ts)
pnpm --filter ./apps/api test
```
