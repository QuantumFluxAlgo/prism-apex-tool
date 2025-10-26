#!/usr/bin/env bash
set -euo pipefail

# Prism-Apex server bootstrap helper (canonical ports)
# - DB host:55433  -> compose service db:5432
# - API host:3000  -> compose service api:3000
# - Web host:5180  -> compose service dashboards:80

TAG="${TAG:-v1.0.0}"
SERVICES="${SERVICES:-db api dashboards}"

echo "===== PRISM-APEX SERVER-UP ====="
echo "tag: $TAG"
echo "services: $SERVICES"
echo

command -v docker >/dev/null || { echo "❌ docker missing"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ docker compose missing"; exit 1; }

# If inside a git repo, fetch tags and checkout the requested tag (best-effort)
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git fetch --all --tags --prune --quiet || true
  if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
    git checkout -q "$TAG"
  fi
fi

echo "→ docker compose pull (best-effort)"
docker compose pull || true

echo "→ docker compose up -d $SERVICES"
set +e
docker compose up -d $SERVICES
UP_RC=$?
set -e
if [ $UP_RC -ne 0 ]; then
  echo "⚠️ docker compose up returned $UP_RC (continuing to health probes)"
fi

DB_MAP="$(docker compose port db 5432 2>/dev/null | head -n1 || true)"
API_MAP="$(docker compose port api 3000 2>/dev/null | head -n1 || true)"
WEB_MAP="$(docker compose port dashboards 80 2>/dev/null | head -n1 || true)"

DB_PORT="${DB_MAP##*:}"
API_PORT="${API_MAP##*:}"
WEB_PORT="${WEB_MAP##*:}"

API_URL="http://localhost:${API_PORT:-3000}"
WEB_URL="http://localhost:${WEB_PORT:-5180}"

echo
echo "→ Waiting for API $API_URL/health (up to 90s)…"
API_OK=0
for _ in $(seq 1 90); do
  if curl -fsS "$API_URL/health" >/dev/null 2>&1 || curl -fsS "$API_URL/api/health" >/dev/null 2>&1; then
    API_OK=1
    break
  fi
  sleep 1
done

echo "→ Waiting for dashboard $WEB_URL (up to 90s)…"
WEB_OK=0
for _ in $(seq 1 90); do
  if [ -n "${WEB_PORT:-}" ] && curl -fsS "$WEB_URL" >/dev/null 2>&1; then
    WEB_OK=1
    break
  fi
  sleep 1
done

echo
echo "===== OUTCOME REPORT ====="
echo "tag: $TAG"
echo "db_host_port: ${DB_PORT:-'(not mapped)'}"
echo "api_url: ${API_URL:-'(not mapped)'}"
echo "web_url: ${WEB_URL:-'(not mapped)'}"
echo "api_health: $([ $API_OK -eq 1 ] && echo up || echo unknown)"
echo "web_health: $([ $WEB_OK -eq 1 ] && echo up || echo unknown)"
echo
echo "commands:"
echo "  docker compose logs -f api"
echo "  docker compose logs -f dashboards"
echo "  docker compose logs -f db"
echo "  curl -fsS $API_URL/health"
echo "  curl -fsS $API_URL/tickets"
echo "  curl -fsS $API_URL/export/tickets.csv | head -n 5"
echo
echo "cleanup:"
echo "  docker compose down"
