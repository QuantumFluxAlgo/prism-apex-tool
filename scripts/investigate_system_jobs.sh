#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
JQ_BIN="${JQ_BIN:-jq}"

if ! command -v curl >/dev/null 2>&1; then
  echo "[FATAL] curl not found"
  exit 1
fi

if ! command -v "$JQ_BIN" >/dev/null 2>&1; then
  echo "[FATAL] jq not found (install jq or set JQ_BIN to a jq-compatible binary)"
  exit 1
fi

echo "=== PRISM APEX — INVESTIGATE /api/system/jobs ==="
echo "Base URL: $BASE_URL"
echo

echo "--- Fetching /api/system/jobs ---"
RAW="$(
  curl -fsS "$BASE_URL/api/system/jobs" \
  | "$JQ_BIN" .
)"

echo "$RAW" >/tmp/prism_apex_system_jobs.json
echo "[OK] Saved raw output to /tmp/prism_apex_system_jobs.json"
echo

echo "--- Job names (unique) ---"
echo "$RAW" | "$JQ_BIN" -r '
  (if type=="array" then . else (.jobs // []) end)
  | map(.name)
  | unique
  | .[]
'
echo

echo "--- Candidates matching strategy/ticket/ingest/yahoo (case-insensitive) ---"
echo "$RAW" | "$JQ_BIN" -r '
  (if type=="array" then . else (.jobs // []) end)
  | map(.name)
  | unique
  | map(select(test("strategy|ticket|ingest|yahoo"; "i")))
  | if length==0 then "NONE" else .[] end
'
echo

echo "--- Full rows for candidates (name + cadence/health fields) ---"
echo "$RAW" | "$JQ_BIN" -r '
  def rows:
    (if type=="array" then . else (.jobs // []) end);
  rows
  | map(select(.name | test("strategy|ticket|ingest|yahoo"; "i")))
  | if length==0 then rows else . end
  | .[]
  | [
      (.name // ""),
      ("everyMs=" + ((.everyMs // .intervalMs // .interval_ms // null) | tostring)),
      ("lastRunUtc=" + ((.lastRunUtc // .lastRunAtUtc // .lastRunAt // .last_run_utc // null) | tostring)),
      ("lastOk=" + ((.lastOk // .ok // .last_ok // null) | tostring)),
      ("lastDurationMs=" + ((.lastDurationMs // .durationMs // .lastDuration // .last_duration_ms // null) | tostring))
    ]
  | @tsv
'
echo

echo "--- DONE ---"
echo "Next: paste the 'Candidates matching...' lines back here so we can hardcode the correct names in the Status/Alerts wiring."
