#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
exec docker compose -f docker-compose.v2.local.yml "$@"
