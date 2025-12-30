#!/bin/sh
set -eu
if ! command -v bash >/dev/null 2>&1; then
  if command -v apk >/dev/null 2>&1; then apk add --no-cache bash >/dev/null 2>&1 || true; fi
fi
if command -v bash >/dev/null 2>&1; then exec /bin/bash -lc "exec \"$@\""; else exec "$@"; fi
