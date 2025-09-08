#!/usr/bin/env bash
set -euo pipefail

pnpm -C apps/api build

docker compose build --no-cache api
docker compose up -d api

echo
echo "== fastify path (inside container) =="
docker compose exec api node -e "console.log('fastify ->', require.resolve('fastify'))"

echo
echo "== local health =="
curl -sf http://localhost:3000/health && echo " ← /health OK"

echo
echo "== local openapi head =="
curl -sf http://localhost:3000/openapi.json | head -n 10

echo
echo "== recent logs =="
docker compose logs --tail=50 api
