#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/work/prism-apex-tool}"
cd "$REPO_DIR"

docker compose --profile dev up -d dashboard-dev
docker compose --profile dev ps dashboard-dev

echo "Dashboard dev server: http://localhost:5179/"
