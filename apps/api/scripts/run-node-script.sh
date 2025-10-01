#!/usr/bin/env bash
set -euo pipefail
# Usage: run-node-script.sh <path-to-dist-script> [args...]
TARGET_RAW="${1:-}"
if [[ -z "$TARGET_RAW" ]]; then
  echo "Usage: $0 <path-to-dist-script> [args...]" >&2
  exit 2
fi
shift || true
base="${TARGET_RAW%.*}"
for ext in cjs mjs js; do
  f="${base}.${ext}"
  if [[ -f "$f" ]]; then
    exec node "$f" "$@"
  fi
done
if [[ -f "${TARGET_RAW}" ]]; then
  tmp="$(mktemp /tmp/run-node-script.XXXXXX.cjs)"
  trap 'rm -f "$tmp"' EXIT
  cp -f "${TARGET_RAW}" "$tmp"
  exec node "$tmp" "$@"
fi
echo "Script not found: ${TARGET_RAW}(.cjs|.mjs|.js)" >&2
exit 1
