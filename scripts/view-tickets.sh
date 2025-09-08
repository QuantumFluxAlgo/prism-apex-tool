#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"
DATE="${1:-$(date -u +%F)}"

curl_auth() {
  if [[ -n "${BEARER_TOKEN-}" ]]; then
    curl -sS -H "Authorization: Bearer ${BEARER_TOKEN}" "$@"
  else
    curl -sS "$@"
  fi
}

echo "GET /tickets?date=$DATE"
curl_auth "$BASE/tickets?date=$DATE" | sed -e 's/},/},\n/g' | head -n 80
