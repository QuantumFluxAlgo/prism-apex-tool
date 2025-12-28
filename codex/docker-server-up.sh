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
docker compose --env-file "$ENV_FILE" -f docker-compose.v2.server.yml down
docker compose --env-file "$ENV_FILE" -f docker-compose.v2.server.yml up -d
