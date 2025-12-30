#!/bin/sh
set -eu
HDR=""; OUT=""; URL=""
while [ $# -gt 0 ]; do
  case "$1" in
    -D) HDR="$2"; shift 2 ;;
    -o) OUT="$2"; shift 2 ;;
    -s|-S) shift ;;
    *) URL="$1"; shift ;;
  esac
done
[ -n "$HDR" ] || exit 1
[ -n "$OUT" ] || exit 1
STATE="${TMPDIR:-/tmp}/ing_mock_state"
COUNT=0
[ -f "$STATE" ] && COUNT=$(cat "$STATE") || true
if [ "$COUNT" -eq 0 ]; then
  echo 1 > "$STATE"
  printf 'HTTP/1.1 429 Too Many Requests\r\nRetry-After: 1\r\n\r\n' > "$HDR"
  : > "$OUT"
else
  echo 2 > "$STATE"
  printf 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n' > "$HDR"
  printf '{"url":"%s"}' "$URL" > "$OUT"
fi
