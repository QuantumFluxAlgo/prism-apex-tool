#!/usr/bin/env bash
set -euo pipefail

API_BASE="http://localhost:8000/compat"

echo "-> Checking API health at ${API_BASE}/health ..."
if ! curl -fsS "${API_BASE}/health" > /dev/null; then
  echo "!! API health check failed at ${API_BASE}/health"
  echo "   Is the API running on port 8000? Try: ./dev_api.sh"
  exit 1
fi
echo "OK"

echo "-> Seeding sample data ..."
RESP="$(curl -fsS -X POST "${API_BASE}/dev/seed" -H 'content-type: application/json')"
echo "Seed response: ${RESP}"

echo "-> Quick sanity:"
echo "   Alerts: $(curl -fsS "${API_BASE}/alerts" | wc -c) bytes"
echo "   Report: $(curl -fsS "${API_BASE}/reports")"
echo "Done."
