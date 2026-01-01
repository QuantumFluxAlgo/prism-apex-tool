#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

COMPOSE="docker-compose.v2.local.yml"
[[ -f "$COMPOSE" ]] || { echo "❌ dc_local: missing $COMPOSE" >&2; exit 1; }
exec docker compose -f "$COMPOSE" "$@"
