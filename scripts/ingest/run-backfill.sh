#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <YAHOO_SYMBOL> <START_ISO> <END_ISO>"
  echo "Example: $0 ES=F 2024-01-01T00:00:00Z 2024-01-05T23:59:00Z"
  exit 1
fi

SYMBOL="$1"
WINDOW_FROM="$2"
WINDOW_TO="$3"

cd /Users/seankeane/Projects/prism-apex-tool

YAHOO_SYMBOLS="$SYMBOL" WINDOW_FROM="$WINDOW_FROM" WINDOW_TO="$WINDOW_TO" pnpm --filter @prism-apex/ingest backfill
