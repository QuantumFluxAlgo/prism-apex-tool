#!/bin/sh
set -eu

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.override.orr-sync.yml"
ENV_FILE="${1:-.env.example.local}"

echo "==> Using env-file: $ENV_FILE"
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE"; exit 1; }

echo "==> Build CJS locally (optional if Dockerfile does it)"
if [ -f package.json ]; then
  if command -v pnpm >/dev/null 2>&1; then pnpm build:cjs:api || true; fi
fi

echo "==> docker compose up -d --build"
docker compose $COMPOSE_FILES --env-file "$ENV_FILE" up -d --build

echo "==> ps"
docker compose $COMPOSE_FILES --env-file "$ENV_FILE" ps

echo "==> Wait for health checks…"
sleep 8

echo "==> tickets-sync logs (last 120)"
docker compose $COMPOSE_FILES --env-file "$ENV_FILE" logs --no-color tickets-sync | tail -n 120 || true
echo
echo "==> orr-sync logs (last 120)"
docker compose $COMPOSE_FILES --env-file "$ENV_FILE" logs --no-color orr-sync | tail -n 120 || true
echo
echo "==> api logs (last 120)"
docker compose $COMPOSE_FILES --env-file "$ENV_FILE" logs --no-color api | tail -n 120 || true
echo
echo "==> tickets tail"
[ -f data/tickets.jsonl ] && tail -n 20 data/tickets.jsonl || echo "data/tickets.jsonl not found yet"

echo "Done."
