#!/usr/bin/env bash
set -euo pipefail

echo "== wait for /health on host =="
attempt=0; code=000
while [ $attempt -lt 40 ]; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' http://localhost:3000/health || echo 000)
  [ "$code" = "200" ] && break
  sleep 0.5; attempt=$((attempt+1))
done
if [ "$code" != "200" ]; then
  echo "Health never reached 200 (got $code)"; docker compose logs --tail=120 api; exit 1
fi
echo "OK: /health 200"

echo
echo "== host: /openapi.json head =="
host_code=$(curl -sS -o /tmp/_oa.body -w '%{http_code}' http://localhost:3000/openapi.json || echo 000)
echo "HTTP $host_code"
if [ "$host_code" = "200" ]; then
  head -n 20 /tmp/_oa.body
else
  echo "OpenAPI not 200 from host; showing container state…"
fi

echo
echo "== container: check baked file & endpoint =="
docker compose exec -T api sh -lc 'set -eu
  echo "-- files --"
  ls -lh /app/apps/api/dist/openapi.json || true
  echo "-- try curl from inside --"
  apk add --no-cache curl >/dev/null 2>&1 || true
  curl -sS -o /tmp/_in.body -w "HTTP %{http_code}\n" http://127.0.0.1:3000/openapi.json || true
  echo "-- first 12 lines (if any) --"
  head -n 12 /tmp/_in.body || true
'
echo
echo "== recent logs =="
docker compose logs --tail=80 api
