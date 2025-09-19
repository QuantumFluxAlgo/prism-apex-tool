#!/usr/bin/env bash
set -euo pipefail
cd ~/work/prism-apex-tool
. "$HOME/.nvm/nvm.sh" && nvm use 20 >/dev/null
docker compose -f docker-compose.yml -f docker-compose.dashboard-lite.yml up -d --no-deps --force-recreate dashboard-lite
lsof -ti tcp:5180 | xargs -r kill || true
nohup pnpm -C apps/dashboard dev --host --port 5180 > logs/dashboard-dev.log 2>&1 &
sleep 2
docker compose -f docker-compose.yml -f docker-compose.dashboard-lite.yml ps
echo "Dashboard-Lite: http://localhost:5179/"
echo "Full dashboard: http://localhost:5180/"
