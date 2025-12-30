#!/bin/sh
set -eu
CID=$(docker ps --filter "name=gapfill-realtime" -q | head -n1 || true)
[ -n "$CID" ] || { echo none; exit 0; }
has_curl=$(docker exec "$CID" /bin/sh -lc 'command -v curl >/dev/null 2>&1 && echo yes || echo no' 2>/dev/null || echo no)
node_fetch=$(docker exec "$CID" /bin/sh -lc 'node -p "typeof globalThis.fetch" 2>/dev/null || echo "undefined"' | tr -d '\r\n')
if [ "$node_fetch" = "function" ]; then echo node; elif [ "$has_curl" = yes ]; then echo curl; else echo unknown; fi
