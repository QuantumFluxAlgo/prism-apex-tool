#!/usr/bin/env bash
set -euo pipefail

echo "## Effective docker compose (merged)"
docker compose config > /tmp/_compose_effective.yml
cat /tmp/_compose_effective.yml
echo

echo "## Compose images"
docker compose images || true
echo

echo "## Dockerfile (first 120 lines)"
nl -ba Dockerfile | sed -n '1,120p'
echo

echo "## Dockerfile (last 120 lines)"
nl -ba Dockerfile | tail -n 120
echo
