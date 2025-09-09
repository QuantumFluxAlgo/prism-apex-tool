#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"

echo "== host checks =="
for path in /health /openapi.json /ready /version; do
  echo "-- GET ${BASE}${path}"
  http_code="$(curl -fsS -o /dev/null -w "%{http_code}" "${BASE}${path}" || true)"
  if [[ "${http_code}" != "200" ]]; then
    echo "FAIL: ${path} -> HTTP ${http_code:-<no response>}"
    exit 1
  fi
done

echo
echo "== in-container check =="
docker compose exec -T api node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
echo "OK: container health endpoint"

echo
echo "All checks passed."
