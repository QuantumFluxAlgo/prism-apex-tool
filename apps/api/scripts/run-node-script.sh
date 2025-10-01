#!/bin/sh
set -eu

# Usage: run-node-script.sh <path-to-dist-script> [args...]
TARGET_RAW="${1:-}"
if [ -z "$TARGET_RAW" ]; then
  echo "Usage: $0 <path-to-dist-script> [args...]" >&2
  exit 2
fi
shift || true

base="${TARGET_RAW%.*}"
found_js=""
for ext in cjs mjs js; do
  f="${base}.${ext}"
  if [ -f "$f" ]; then
    if [ "$ext" = "js" ]; then
      found_js="$f"
      continue
    fi
    exec node "$f" "$@"
  fi
done

if [ -n "$found_js" ]; then
  tmp="${found_js%.js}.tmp.cjs"
  trap 'rm -f "$tmp"' EXIT INT TERM
  cp -f "$found_js" "$tmp"
  exec node "$tmp" "$@"
fi

echo "Script not found: ${TARGET_RAW}(.cjs|.mjs|.js)" >&2
exit 1
