#!/bin/sh
set -eu
export ING_METRICS_PATH="/tmp/ingress-metrics.jsonl"
: > "$ING_METRICS_PATH" || true
. "$(pwd)/tools/ingress/governor.sh"
metric ok 200 '' 0 5 unit-test
grep -q '"event":"ok"' "$ING_METRICS_PATH"
echo "OK: governor metrics"
