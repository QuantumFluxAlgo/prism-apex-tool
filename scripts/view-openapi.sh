#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8081}"  # choose a different port if 8081 is busy
API_URL="${API_URL:-http://localhost:3000/openapi.json}"

# Show who (if anyone) is holding the port
if command -v lsof >/dev/null 2>&1; then
  echo "== Checking port $PORT =="
  lsof -iTCP:$PORT -sTCP:LISTEN -n -P || true
fi

# Stop any old viewer on that port with same name
docker rm -f swagger-ui-$PORT >/dev/null 2>&1 || true

echo "== Starting Swagger UI on http://localhost:$PORT =="
docker run --rm --name swagger-ui-$PORT -p $PORT:8080 \
  -e URL="$API_URL" \
  swaggerapi/swagger-ui
