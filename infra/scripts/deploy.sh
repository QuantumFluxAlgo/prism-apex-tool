#!/usr/bin/env bash
set -euo pipefail

# Expected env: STACK_NAME, TAG, GHCR_OWNER
STACK_NAME=${STACK_NAME:-prism}
TAG=${TAG:-latest}
GHCR_OWNER=${GHCR_OWNER:-yourorg}
STACK_DIR=${STACK_DIR:-$HOME/prism-stack}
export TAG GHCR_OWNER

cd "$STACK_DIR"

# Ensure .env exists (operator should upload it once based on .env.prod.example)
if [ ! -f ".env" ]; then
  echo "[DEPLOY] ERROR: $STACK_DIR/.env not found. Upload your production env first."
  exit 1
fi

echo "[DEPLOY] Pulling images ghcr.io/${GHCR_OWNER}/prism-apex-*: ${TAG}"
docker compose -f docker-compose.prod.yml pull

echo "[DEPLOY] Starting updated stack..."
docker compose -f docker-compose.prod.yml up -d

# Health gate: poll both services
deadline=$((SECONDS + 120))
ok_api=0
ok_dash=0
while [ $SECONDS -lt $deadline ]; do
  if curl -fsS http://127.0.0.1:8080/health >/dev/null; then ok_api=1; fi
  if curl -fsS http://127.0.0.1/ >/dev/null; then ok_dash=1; fi
  if [ $ok_api -eq 1 ] && [ $ok_dash -eq 1 ]; then break; fi
  sleep 3

done

if [ $ok_api -ne 1 ] || [ $ok_dash -ne 1 ]; then
  echo "[DEPLOY] ERROR: health checks failed. See 'docker compose logs'."
  exit 2
fi

echo "[DEPLOY] Success. Stack ${STACK_NAME} is healthy on tag ${TAG}."
