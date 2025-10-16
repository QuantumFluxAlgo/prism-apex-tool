# Docker — API-only quickstart

## Prereqs
- Docker Desktop (Compose v2)

## Run
```bash
docker compose up -d --build
docker compose ps

Verify
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3000/openapi.json | head -n 20
curl -fsS http://localhost:3000/ready
curl -fsS http://localhost:3000/version
bash scripts/smoke-openapi.sh
bash scripts/smoke-endpoints.sh
bash scripts/smoke-api-docker.sh
```

Notes:

This compose is API-only. Public endpoints: /health, /ready, /openapi.json, /version.

scripts/smoke-api.sh is dev-only (requires host Node/tsc). Prefer the Docker-only scripts above.

For server deploys, docker-compose.prod.yml may map port 80 (via 80:${PORT:-8000}); local quickstart uses port 3000.
