#!/usr/bin/env bash
set -euo pipefail

# Always run from repo root (supports invocation from subdirs)
cd "$(dirname "$0")"

log() { printf "\033[1;32m[dev:web]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[dev:web]\033[0m %s\n" "$*" >&2; }

# Move into dashboard app
cd apps/dashboard

# Confirm port used in vite.config.* (should be 3000 as per PR5/PR6)
log "Starting Vite dev server on http://localhost:3000"
log "Proxy is configured so /api/* → http://localhost:8000/compat/*"

# Run Vite dev
exec pnpm run dev
