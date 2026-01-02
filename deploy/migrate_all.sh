#!/bin/sh
set -eu

echo "[migrate] wait for postgres at ${PGHOST:-db}:${PGPORT:-5432} db=${PGDATABASE:-prismapex} user=${PGUSER:-apex}"

i=0
until pg_isready -h "${PGHOST:-db}" -p "${PGPORT:-5432}" -U "${PGUSER:-apex}" -d "${PGDATABASE:-prismapex}" >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -ge 60 ]; then
    echo "[migrate][FATAL] postgres not ready after 60s"
    exit 2
  fi
  sleep 1
done

echo "[migrate] applying /migrations/*.sql (sorted)"
for f in $(ls -1 /migrations/*.sql 2>/dev/null | sort); do
  echo "[migrate] -> $f"
  psql -v ON_ERROR_STOP=1 -f "$f"
done

echo "[migrate] done"
