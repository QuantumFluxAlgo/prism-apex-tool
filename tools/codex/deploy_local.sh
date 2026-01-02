#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SOT="docker-compose.v2.local.yml"

echo "== render (must succeed) =="
docker compose -f "$SOT" config > /tmp/prismapex_local_render.yml
echo "rendered -> /tmp/prismapex_local_render.yml"

echo "== bring down (remove orphans) =="
docker compose -f "$SOT" down --remove-orphans

echo "== bring up (migrate runs + jobs always-on) =="
docker compose -f "$SOT" up -d --build --force-recreate --remove-orphans

echo "== guard (must pass) =="
bash tools/codex/guard_ports_local.sh

echo "== wait ui-meta =="
for i in {1..120}; do
  if curl -fsS "http://127.0.0.1:5180/ui-meta" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "== smoke =="
curl -fsS "http://127.0.0.1:5180/ui-meta" | head -c 200; echo
curl -fsS "http://127.0.0.1:5180/health" | head -c 200; echo

echo "== services =="
docker compose -f "$SOT" ps

echo "== DONE =="
