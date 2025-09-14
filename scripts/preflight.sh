#!/usr/bin/env bash
set -euo pipefail

echo "== git =="
git --version

echo "== node =="
node --version

echo "== pnpm =="
pnpm --version

echo "== docker =="
if command -v docker >/dev/null 2>&1; then
  docker --version
  docker ps >/dev/null || echo "docker ps failed"
else
  echo "docker not found"
fi

PORT=${PORT:-3000}
ENDPOINT=${ENDPOINT:-http://localhost:${PORT}/health}

echo "== port ${PORT} =="
if command -v ss >/dev/null 2>&1; then
  if ss -ltn | grep -q ":${PORT} "; then
    echo "Port ${PORT} is in use"
  else
    echo "Port ${PORT} is free"
  fi
else
  echo "ss command not found; skipping port check"
fi

echo "== endpoint ${ENDPOINT} =="
code=$(curl -sS -o /tmp/_preflight.body -w '%{http_code}' "${ENDPOINT}" || echo 000)
echo "${ENDPOINT} -> ${code}"
if [ "${code}" = "200" ]; then
  head -n 20 /tmp/_preflight.body
fi
