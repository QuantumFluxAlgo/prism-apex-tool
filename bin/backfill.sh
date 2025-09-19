#!/usr/bin/env bash
# Triggers split-validate workflow across a date range on branch Test.
# Usage: bin/backfill.sh START_DATE END_DATE [STRATEGY]
# Example: bin/backfill.sh 2025-09-15 2025-09-19 default
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: bin/backfill.sh START_DATE END_DATE [STRATEGY]"
  exit 1
fi

START="$1"
END="$2"
STRATEGY="${3:-default}"

command -v gh >/dev/null 2>&1 || { echo "gh CLI is required"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "python3 is required"; exit 1; }

while IFS= read -r d; do
  gh workflow run .github/workflows/split-validate.yml -r Test -f D="$d" -f S="$STRATEGY"
  sleep 1
done < <(python3 - <<PY
import datetime
s = datetime.date.fromisoformat("$START")
e = datetime.date.fromisoformat("$END")
if s > e:
    s, e = e, s
cur = s
while cur <= e:
    print(cur.isoformat())
    cur += datetime.timedelta(days=1)
PY
)
