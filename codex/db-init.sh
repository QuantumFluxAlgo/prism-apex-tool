#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
CONTAINER="${1:-prismapex-postgres}"
POSTGRES_DB="${2:-${POSTGRES_DB:-prismapex}}"
POSTGRES_USER="${3:-${POSTGRES_USER:-prismapex}}"

cd "$ROOT_DIR"
echo "[codex/db-init] applying schema_v2.sql inside container: $CONTAINER (db=$POSTGRES_DB user=$POSTGRES_USER)"
docker exec -i "$CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < apps/api/db/schema_v2.sql
