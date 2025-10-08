#!/usr/bin/env bash
set -euo pipefail

if command -v rg >/dev/null 2>&1; then
  hits=$(rg -n --no-ignore -S \
    -e 'rapidapi\.com' \
    -e 'X-RapidAPI-(Key|Host)' \
    -e '\bRAPIDAPI_[A-Z0-9_]+' \
    -g '!node_modules' -g '!.git' -g '!dist' -g '!build' \
    || true)
else
  hits=$(grep -RInE 'rapidapi\.com|X-RapidAPI-(Key|Host)|\bRAPIDAPI_[A-Z0-9_]+' \
    --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
    . || true)
fi

if [[ -n "$hits" ]]; then
  echo "RapidAPI references detected:\n$hits" >&2
  exit 1
fi

echo "RapidAPI guard: no references found."
