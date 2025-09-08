#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"

for p in /health /openapi.json /ready /version; do
  echo "GET $p"
  code=$(curl -sS -o /tmp/_body -w '%{http_code}' "$BASE$p" || echo 000)
  head -n 12 /tmp/_body || true
  echo
  echo "HTTP $code"
  echo "---------------------------"
done
