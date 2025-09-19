#!/usr/bin/env bash
set -euo pipefail
START="${1:?YYYY-MM-DD}"
END="${2:?YYYY-MM-DD}"
STRAT="${3:-APX-DDB-01}"
REPO="${REPO:-QuantumFluxAlgo/prism-apex-tool}"
inc_date() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$1" <<'PY'
import sys, datetime
d = datetime.date.fromisoformat(sys.argv[1])
print((d + datetime.timedelta(days=1)).isoformat())
PY
  elif date -j -v+1d -f "%Y-%m-%d" "$1" "+%Y-%m-%d" >/dev/null 2>&1; then
    date -j -v+1d -f "%Y-%m-%d" "$1" "+%Y-%m-%d"
  else
    date -d "$1 + 1 day" "+%Y-%m-%d"
  fi
}
d="$START"
while :; do
  gh workflow run split-validate.yml -R "$REPO" -f D="$d" -f S="$STRAT" || true
  [ "$d" = "$END" ] && break
  d="$(inc_date "$d")"
done
