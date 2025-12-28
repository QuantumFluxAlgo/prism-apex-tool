#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"

cd "$ROOT_DIR"
echo "[codex/docker-local-up] bringing down local stack"
docker compose --profile local -f docker-compose.yml down --remove-orphans -v
echo "[codex/docker-local-up] starting local stack (rebuilding images)"
docker compose --profile local -f docker-compose.yml up -d --remove-orphans --build

echo "[codex/docker-local-up] applying core schema"
docker compose --profile local -f docker-compose.yml exec -T db sh -c "cat >/tmp/schema.sql && psql -v ON_ERROR_STOP=1 -U ${PGUSER:-apex} -d ${PGDATABASE:-prismapex} -f /tmp/schema.sql && rm /tmp/schema.sql" < apps/api/db/schema_v2.sql

echo "[codex/docker-local-up] applying SQL migrations"
DB_USER="${PGUSER:-apex}"
DB_NAME="${PGDATABASE:-prismapex}"
for sql in deploy/sql/*.sql; do
  echo "  -> $(basename "$sql")"
  docker compose --profile local -f docker-compose.yml exec -T db sh -c "cat >/tmp/migrate.sql && psql -v ON_ERROR_STOP=1 -U \"$DB_USER\" -d \"$DB_NAME\" -f /tmp/migrate.sql && rm /tmp/migrate.sql" < "$sql"
done

echo "[codex/docker-local-up] running initial backfills (ingest-once, gapfill-once, tickets-once)"
YAHOO_RANGE=1d COMPOSE_PROFILES=local,jobs docker compose -f docker-compose.yml run --rm ingest-once
YAHOO_RANGE=1d COMPOSE_PROFILES=local,jobs docker compose -f docker-compose.yml run --rm tickets-once
