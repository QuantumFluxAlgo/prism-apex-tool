#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
docker compose --profile local up -d
docker compose --profile local ps
echo "API: http://localhost:3000/health"
echo "Dashboard (compose): http://localhost:5180/tickets"
echo "Dashboard (dev profile): http://localhost:5179"
