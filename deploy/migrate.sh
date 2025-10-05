#!/bin/sh
set -eu
DB_URL="${DATABASE_URL:-postgres://apex:apex@db:5432/prismapex}"
echo "[migrate] applying SQL files..."
for f in /repo/deploy/sql/00*.sql; do
  [ -f "$f" ] || continue
  echo " -> $f"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f" || true
done
echo "[migrate] done."
