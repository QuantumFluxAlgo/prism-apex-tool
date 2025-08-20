#!/usr/bin/env bash
set -euo pipefail

# Always run from repo root (supports invocation from subdirs)
cd "$(dirname "$0")"

# Nice logging
log() { printf "\033[1;34m[dev:api]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[dev:api]\033[0m %s\n" "$*" >&2; }

# Defaults
export PORT="${PORT:-8000}"
export HOST="${HOST:-0.0.0.0}"
export DATA_DIR="${DATA_DIR:-/var/lib/prism-apex-tool}"

# Load local env (if present)
ENV_FILE="apps/api/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  log "Loading env from $ENV_FILE"
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
else
  log "No $ENV_FILE found (that's OK). Using inline defaults if any."
fi

# Ensure data dir exists (store.ts writes data.json here)
if [[ ! -d "$DATA_DIR" ]]; then
  log "Creating DATA_DIR at $DATA_DIR"
  mkdir -p "$DATA_DIR"
fi

# Sanity: show essentials
log "PORT=$PORT HOST=$HOST DATA_DIR=$DATA_DIR"

# Tooling checks (soft)
command -v pnpm >/dev/null 2>&1 || err "pnpm not found. Install with: corepack enable && corepack prepare pnpm@latest --activate"
command -v node  >/dev/null 2>&1 || err "node not found. Install Node 20+."
# tsx is invoked via pnpm dlx, so no global install required.

# Run API in watch mode
log "Starting Fastify (tsx watch)…"
exec pnpm -w dlx tsx watch apps/api/src/index.ts
