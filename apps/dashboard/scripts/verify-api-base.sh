#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
if rg 'fetch\(\s*["'\'']/api/' src >/dev/null 2>&1; then
  echo "Relative /api fetch detected"
  rg -n 'fetch\(\s*["'\'']/api/' src
  exit 1
fi
exit 0
