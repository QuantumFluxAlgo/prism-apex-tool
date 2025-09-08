#!/usr/bin/env bash
set -euo pipefail

pnpm -C apps/api build
docker compose build --no-cache api
docker compose up -d api

echo "== fastify path (inside container) =="
docker compose exec -T api node -e "console.log('fastify ->', require.resolve('fastify'))"

echo "== wait for /health =="
attempt=0; code=000
while [ $attempt -lt 20 ]; do
  code=$(curl -sS -o /tmp/_health.body -w '%{http_code}' http://localhost:3000/health || echo 000)
  [ "$code" = "200" ] && break
  sleep 1; attempt=$((attempt+1))
done
[ "$code" = "200" ] || { echo "Health failed with $code"; docker compose logs --tail=120 api; exit 1; }

echo "== health body =="; cat /tmp/_health.body; echo; echo "← /health 200"

echo "== try openapi endpoints =="
ok=0
for p in /openapi.json /documentation/json /docs/json /swagger.json; do
  code=$(curl -sS -o /tmp/_oa.body -w '%{http_code}' "http://localhost:3000$p" || echo 000)
  echo "$p -> $code"
  if [ "$code" = "200" ]; then
    echo "== $p (head) =="; head -n 12 /tmp/_oa.body; ok=1; break
  fi
done
[ "$ok" = "1" ] || echo "OpenAPI endpoint not found (but API is healthy)."

echo "== recent logs =="; docker compose logs --tail=80 api
