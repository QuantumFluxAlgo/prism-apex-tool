#!/usr/bin/env bash
set -euo pipefail

# Start the API in a lightweight Docker container that mirrors the local mock stack.
# This is primarily useful when you want an isolated service without installing
# the Node toolchain locally.

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

API_PORT="${API_PORT:-8000}"
NAME="${NAME:-apex-api-dev}"
IMAGE="${IMAGE:-prism-apex/api:mock-local}"
DATA_DIR="${DATA_DIR:-$ROOT_DIR/var/mock-api}"
FORCE_BUILD="${FORCE_BUILD:-0}"

log() { printf '\033[1;36m[dev-api-mock]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[dev-api-mock]\033[0m %s\n' "$*" >&2; }

command -v docker >/dev/null 2>&1 || { err "Docker is required"; exit 10; }

mkdir -p "$DATA_DIR"

ensure_image() {
  if [[ "$FORCE_BUILD" != "0" ]] || ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    log "Building image ($IMAGE) from Dockerfile target=api..."
    docker build --target api -t "$IMAGE" .
  fi
}

ensure_image

log "Recreating container $NAME (host port ${API_PORT} -> container port 3000)..."
docker rm -f "$NAME" >/dev/null 2>&1 || true

docker run -d \
  --name "$NAME" \
  -p "${API_PORT}:3000" \
  -e PORT=3000 \
  -e DATA_DIR=/var/lib/prism-apex-tool \
  -e NODE_ENV=development \
  -v "$DATA_DIR":/var/lib/prism-apex-tool \
  "$IMAGE" >/dev/null

log "API mock running. Try: curl -fsS http://localhost:${API_PORT}/health"
