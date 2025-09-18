#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
files=(-f docker-compose.yml)
for f in \
  docker-compose.dashboard.yml \
  docker-compose.dashboard-lite.yml \
  docker-compose.yahoo.yml \
  docker-compose.yahoo-api.yml \
  docker-compose.orr-sync.yml \
  docker-compose.override.orr-sync.yml \
  docker-compose.tickets-sync.yml \
  docker-compose.ingress.yml \
  docker-compose.dashboard-lite.fix.yml
do
  [ -f "$f" ] && files+=(-f "$f")
done
docker compose "${files[@]}" up -d --build
docker compose "${files[@]}" ps
echo "API: http://localhost:3000/health"
echo "Dashboard (full): http://localhost:5180/tickets"
echo "Dashboard (lite): http://localhost:5179"
