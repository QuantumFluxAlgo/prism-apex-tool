#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

CANDIDATES=(
  docker-compose.v2.local.yml
  docker-compose.v2.yml
  docker-compose.yml
  compose.v2.local.yml
  compose.v2.yml
  compose.yml
)

COMPOSE_FILE=""
for f in "${CANDIDATES[@]}"; do
  if [ -f "$f" ] && docker compose -f "$f" ps -q >/dev/null 2>&1; then
    if [ -n "$(docker compose -f "$f" ps -q | head -n 1)" ]; then
      COMPOSE_FILE="$f"
      break
    fi
  fi
done

if [ -z "${COMPOSE_FILE:-}" ]; then
  for f in "${CANDIDATES[@]}"; do
    if [ -f "$f" ]; then
      COMPOSE_FILE="$f"
      break
    fi
  done
fi

if [ -z "${COMPOSE_FILE:-}" ]; then
  echo "[FAIL] No compose file found. Checked: ${CANDIDATES[*]}"
  exit 1
fi

echo "[db-normalize] compose=$COMPOSE_FILE"

DB_SVC=""
SVCS=()
while IFS= read -r svc; do
  SVCS+=("$svc")
done < <(docker compose -f "$COMPOSE_FILE" config --services 2>/dev/null || true)
for svc in "${SVCS[@]:-}"; do
  cid="$(docker compose -f "$COMPOSE_FILE" ps -q "$svc" 2>/dev/null || true)"
  if [ -n "${cid:-}" ]; then
    img="$(docker inspect -f '{{.Config.Image}}' "$cid" 2>/dev/null || true)"
    if echo "$img" | grep -qi 'postgres'; then
      DB_SVC="$svc"
      break
    fi
  fi
done
if [ -z "${DB_SVC:-}" ]; then
  for guess in db postgres database pg; do
    if printf "%s\n" "${SVCS[@]:-}" | grep -qx "$guess"; then
      DB_SVC="$guess"
      break
    fi
  done
fi

if [ -z "${DB_SVC:-}" ]; then
  echo "[FAIL] Could not detect Postgres service in compose."
  echo "       services: ${SVCS[*]:-<none>}"
  exit 1
fi

echo "[db-normalize] db_service=$DB_SVC"

echo "[db-normalize] waiting for db to accept connections..."
for i in $(seq 1 80); do
  if docker compose -f "$COMPOSE_FILE" exec -T "$DB_SVC" pg_isready -U apex -d prismapex >/dev/null 2>&1; then
    break
  fi
  if docker compose -f "$COMPOSE_FILE" exec -T "$DB_SVC" pg_isready -U prismapex -d prismapex >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

PSQL_USER="apex"
if ! docker compose -f "$COMPOSE_FILE" exec -T "$DB_SVC" psql -U apex -d postgres -c "select 1" >/dev/null 2>&1; then
  PSQL_USER="prismapex"
fi

echo "[db-normalize] using psql user: $PSQL_USER"

docker compose -f "$COMPOSE_FILE" exec -T "$DB_SVC" psql -U "$PSQL_USER" -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex') THEN
    CREATE ROLE apex LOGIN PASSWORD 'apex';
  ELSE
    BEGIN
      ALTER ROLE apex WITH LOGIN PASSWORD 'apex';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'apex cannot alter itself; skipping.';
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='prismapex') THEN
    CREATE ROLE prismapex LOGIN PASSWORD 'prismapex';
  ELSE
    BEGIN
      ALTER ROLE prismapex WITH LOGIN PASSWORD 'prismapex';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'prismapex cannot alter itself; skipping.';
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='prismapex') THEN
    CREATE DATABASE prismapex;
  END IF;
END $$;

GRANT ALL PRIVILEGES ON DATABASE prismapex TO apex;
GRANT ALL PRIVILEGES ON DATABASE prismapex TO prismapex;

\connect prismapex

GRANT ALL ON SCHEMA public TO apex;
GRANT ALL ON SCHEMA public TO prismapex;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO apex;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prismapex;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO apex;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prismapex;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO apex;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prismapex;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO apex;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prismapex;
SQL

echo "[db-normalize] OK roles+grants normalized."
