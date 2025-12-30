#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
ENV_FILE="$ROOT_DIR/codex/.env.server"

if [[ ! -f "$ENV_FILE" ]]; then
  cat <<'EOF' >&2
[codex/docker-server-up] Missing codex/.env.server (see docs/DOCKER_COMPOSE.md).
Define required variables such as:
  POSTGRES_PASSWORD=...
  PUBLIC_API_BASE=...
  INGEST_YAHOO_SYMBOLS=...
and retry.
EOF
  exit 1
fi

cd "$ROOT_DIR"
set -a
source "$ENV_FILE"
set +a
echo "[codex/docker-server-up] bringing down prod stack"
docker compose --profile prod --env-file "$ENV_FILE" -f docker-compose.yml down --remove-orphans -v
echo "[codex/docker-server-up] starting prod stack (rebuilding images)"
docker compose --profile prod --env-file "$ENV_FILE" -f docker-compose.yml up -d --remove-orphans --build

echo "[codex/docker-server-up] applying core schema"
docker compose --profile prod --env-file "$ENV_FILE" -f docker-compose.yml exec -T db sh -c "cat >/tmp/schema.sql && psql -v ON_ERROR_STOP=1 -U ${POSTGRES_USER:-${PGUSER:-apex}} -d ${POSTGRES_DB:-${PGDATABASE:-prismapex}} -f /tmp/schema.sql && rm /tmp/schema.sql" < apps/api/db/schema_v2.sql

echo "[codex/docker-server-up] applying SQL migrations"
DB_USER="${POSTGRES_USER:-${PGUSER:-apex}}"
DB_NAME="${POSTGRES_DB:-${PGDATABASE:-prismapex}}"
for sql in deploy/sql/*.sql; do
  echo "  -> $(basename "$sql")"
  docker compose --profile prod --env-file "$ENV_FILE" -f docker-compose.yml exec -T db sh -c "cat >/tmp/migrate.sql && psql -v ON_ERROR_STOP=1 -U \"$DB_USER\" -d \"$DB_NAME\" -f /tmp/migrate.sql && rm /tmp/migrate.sql" < "$sql"
done

echo "[codex/docker-server-up] running initial backfills (ingest-once, gapfill-once, tickets-once)"
YAHOO_RANGE=7d COMPOSE_PROFILES=prod,jobs docker compose --env-file "$ENV_FILE" -f docker-compose.yml run --rm ingest-once
YAHOO_RANGE=7d COMPOSE_PROFILES=prod,jobs docker compose --env-file "$ENV_FILE" -f docker-compose.yml run --rm gapfill-once
YAHOO_RANGE=7d COMPOSE_PROFILES=prod,jobs docker compose --env-file "$ENV_FILE" -f docker-compose.yml run --rm tickets-once
