#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Prism Apex - Docker/Compose Recon + P1-3 Closure Checks (READ-ONLY by default)
#
# What it does:
#   - Finds compose files (local + server variants) and prints what it discovers
#   - Detects the running Postgres container + mapped host port
#   - Detects the API container + mapped host port
#   - Builds DATABASE_URL (override-able)
#   - Verifies migration 033 contents (PK tuple)
#   - Optionally applies migration 033 to the running DB (APPLY_MIGRATIONS=1)
#   - Smokes planner-rejects route: 401 without bearer, 200 with bearer
#   - Verifies hook references exist in engineRunJob/safetyEnvelope/ticketizer
#   - Runs pnpm -C apps/api test (RUN_TESTS=1)
#
# Defaults:
#   - READ-ONLY: does NOT apply migrations unless APPLY_MIGRATIONS=1
#   - Does NOT start/stop containers; only inspects what's running
#
# Environment knobs:
#   COMPOSE_FILE_HINT   : optional path/name filter to prefer a compose file
#   DATABASE_URL        : override DB url (otherwise inferred)
#   APPLY_MIGRATIONS    : 1 to apply 033 via psql (default 0)
#   BEARER_TOKEN        : token for 200-smoke (default "smoke-token")
#   SESSION_DATE        : date for route query (default: today UTC)
#   RUN_TESTS           : 1 to run pnpm tests (default 1)
#   API_HOST            : override (default 127.0.0.1)
#   API_PORT            : override inferred API host port
# -----------------------------------------------------------------------------

say() { printf "\n[%s] %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"; }
die() { say "ERROR: $*"; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "${ROOT:-}" ] || die "Not in a git repo. cd into prism-apex-tool first."
cd "$ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
say "repo: $ROOT"
say "branch: $BRANCH"

# --- knobs -------------------------------------------------------------------
APPLY_MIGRATIONS="${APPLY_MIGRATIONS:-0}"
RUN_TESTS="${RUN_TESTS:-1}"
BEARER_TOKEN="${BEARER_TOKEN:-smoke-token}"
SESSION_DATE="${SESSION_DATE:-$(date -u +%F)}"
API_HOST="${API_HOST:-127.0.0.1}"

# --- toolchain ---------------------------------------------------------------
have docker || die "docker not found"
have rg || die "rg (ripgrep) not found"
have psql || say "WARN: psql not found; DB apply/query may be limited"

# --- discover compose files --------------------------------------------------
say "discovering compose files (docker compose v2)…"

mapfile -t COMPOSE_CANDIDATES < <(
  find . -maxdepth 4 -type f \
    \( -iname "docker-compose.yml" -o -iname "docker-compose.yaml" \
       -o -iname "compose.yml" -o -iname "compose.yaml" \
       -o -iname "*compose.v2*.yml" -o -iname "*compose.v2*.yaml" \
       -o -iname "docker-compose.v2*.yml" -o -iname "docker-compose.v2*.yaml" \
    \) | sed 's|^\./||' | sort
)

if [ "${#COMPOSE_CANDIDATES[@]}" -eq 0 ]; then
  say "WARN: no compose files found under repo root (maxdepth=4)."
else
  say "compose candidates:"
  for f in "${COMPOSE_CANDIDATES[@]}"; do
    printf "  - %s\n" "$f"
  done
fi

# Prefer a hinted compose file if provided; otherwise rely on docker compose default resolution.
COMPOSE_FILE_HINT="${COMPOSE_FILE_HINT:-}"
if [ -z "${COMPOSE_FILE_HINT:-}" ]; then
  for hint in docker-compose.v2.local.yml docker-compose.v2.local.yaml docker-compose.v2.server.yml docker-compose.v2.yml docker-compose.v2.yaml docker-compose.yml compose.v2.yml compose.yml; do
    if [ -f "$hint" ]; then
      COMPOSE_FILE_HINT="$hint"
      say "auto-selected compose hint: $COMPOSE_FILE_HINT"
      break
    fi
  done
fi

COMPOSE_ARGS=()
if [ -n "${COMPOSE_FILE_HINT:-}" ]; then
  if [ -f "$COMPOSE_FILE_HINT" ]; then
    COMPOSE_ARGS=(-f "$COMPOSE_FILE_HINT")
  else
    MATCH="$(printf "%s\n" "${COMPOSE_CANDIDATES[@]}" | rg -n "$COMPOSE_FILE_HINT" | head -n1 | cut -d: -f2- || true)"
    if [ -n "${MATCH:-}" ] && [ -f "$MATCH" ]; then
      COMPOSE_ARGS=(-f "$MATCH")
    else
      say "WARN: COMPOSE_FILE_HINT set but no match found; falling back to docker compose defaults"
    fi
  fi
fi

# --- docker compose ps -------------------------------------------------------
say "docker compose ps (using: ${COMPOSE_ARGS[*]:-(default)})"
docker compose "${COMPOSE_ARGS[@]}" ps || say "WARN: docker compose ps failed (still continuing with docker ps heuristics)"

# --- detect postgres container and host port --------------------------------
say "detecting Postgres container + host port…"

DB_CONTAINER="$(
  docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' \
    | awk 'BEGIN{IGNORECASE=1} $2 ~ /postgres/ {print $1; exit}'
)"
if [ -z "${DB_CONTAINER:-}" ]; then
  DB_CONTAINER="$(
    docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' \
      | awk 'BEGIN{IGNORECASE=1} $1 ~ /db|postgres/ {print $1; exit}'
  )"
fi
[ -n "${DB_CONTAINER:-}" ] || die "No running postgres container detected."

DB_PORT_LINE="$(docker ps --format '{{.Names}}\t{{.Ports}}' | awk -v n="$DB_CONTAINER" '$1==n{print $2}')"
DB_HOST_PORT="$(echo "$DB_PORT_LINE" | sed -nE 's/.*0\.0\.0\.0:([0-9]+)->5432\/tcp.*/\1/p' | head -n1)"
if [ -z "${DB_HOST_PORT:-}" ]; then
  DB_HOST_PORT="$(echo "$DB_PORT_LINE" | sed -nE 's/.*\[::\]:([0-9]+)->5432\/tcp.*/\1/p' | head -n1)"
fi
[ -n "${DB_HOST_PORT:-}" ] || die "Could not infer DB host port from: $DB_PORT_LINE"

say "db container: $DB_CONTAINER"
say "db host port: $DB_HOST_PORT"

if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL="postgres://apex:apex@localhost:${DB_HOST_PORT}/prismapex"
fi
say "DATABASE_URL: $DATABASE_URL"

# --- detect API container and host port -------------------------------------
say "detecting API container + host port…"

API_CONTAINER="$(
  docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' \
    | awk 'BEGIN{IGNORECASE=1} $1 ~ /api/ || $2 ~ /api/ {print $1; exit}'
)"
if [ -z "${API_CONTAINER:-}" ]; then
  API_CONTAINER="$(
    docker ps --format '{{.Names}}\t{{.Ports}}' \
      | awk '($2 ~ /->3000\/tcp/ || $2 ~ /->3310\/tcp/) {print $1; exit}'
  )"
fi

API_PORT="${API_PORT:-}"
if [ -n "${API_CONTAINER:-}" ] && [ -z "${API_PORT:-}" ]; then
  API_PORT_LINE="$(docker ps --format '{{.Names}}\t{{.Ports}}' | awk -v n="$API_CONTAINER" '$1==n{print $2}')"
  API_PORT="$(echo "$API_PORT_LINE" | sed -nE 's/.*0\.0\.0\.0:([0-9]+)->3000\/tcp.*/\1/p' | head -n1)"
  if [ -z "${API_PORT:-}" ]; then
    API_PORT="$(echo "$API_PORT_LINE" | sed -nE 's/.*\[::\]:([0-9]+)->3000\/tcp.*/\1/p' | head -n1)"
  fi
fi

if [ -n "${API_CONTAINER:-}" ]; then
  say "api container: $API_CONTAINER"
  if [ -n "${API_PORT:-}" ]; then
    say "api host port (inferred): $API_PORT"
  else
    say "WARN: could not infer api host port from docker ps"
  fi
else
  say "WARN: no obvious API container detected (still proceeding; you can set API_PORT manually)"
fi

# --- Verify migration content ------------------------------------------------
say "verifying migration 033 exists + PK tuple…"

MIG033="deploy/sql/033_planner_reject_counts.sql"
[ -f "$MIG033" ] || die "Missing $MIG033"

PK_OK=0
if rg -n "PRIMARY KEY|CONSTRAINT .*PRIMARY KEY" "$MIG033" >/dev/null 2>&1; then
  for tok in session_date symbol requested_planner rejecting_planner reject_stage reason_code; do
    rg -n "$tok" "$MIG033" >/dev/null 2>&1 || die "Migration 033 missing token: $tok"
  done
  PK_OK=1
fi
[ "$PK_OK" -eq 1 ] || die "Could not find PRIMARY KEY clause in $MIG033"
say "OK: migration 033 present and contains required key tuple tokens"

# --- Optional: apply migration 033 ------------------------------------------
if [ "$APPLY_MIGRATIONS" = "1" ]; then
  have psql || die "psql not available; cannot apply migrations"
  say "APPLY_MIGRATIONS=1 -> applying $MIG033 to $DATABASE_URL"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIG033"
  say "OK: applied migration 033"
else
  say "READ-ONLY mode: skipping DB apply (set APPLY_MIGRATIONS=1 to apply 033)"
fi

# --- DB smoke: table exists --------------------------------------------------
if have psql; then
  say "checking DB table existence: planner_reject_counts"
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "select to_regclass('public.planner_reject_counts');" | rg -q "planner_reject_counts"; then
    say "OK: planner_reject_counts exists"
  else
    say "WARN: planner_reject_counts does not exist in DB yet (apply 033 and rerun)"
  fi
else
  say "WARN: skipping DB table existence check (psql missing)"
fi

# --- Verify hooks exist in code ---------------------------------------------
say "verifying hook references exist (engineRunJob / safetyEnvelope / ticketizer)…"

HOOKS_OK=1
for f in \
  "apps/api/src/jobs/engineRunJob.ts" \
  "apps/api/src/services/strategy-engine/safetyEnvelope.ts" \
  "apps/api/src/jobs/ticketizer.ts"
do
  [ -f "$f" ] || { say "MISSING: $f"; HOOKS_OK=0; continue; }
  if rg -n "recordPlannerRejectCountBestEffort" "$f" >/dev/null 2>&1; then
    say "OK: hook found in $f"
  else
    say "WARN: hook NOT found in $f"
    HOOKS_OK=0
  fi
done

say "sanity: store/vocab/recorder files present…"
for f in \
  "apps/api/src/store/plannerRejectCounts.ts" \
  "apps/api/src/system-records/plannerRejectVocab.ts" \
  "apps/api/src/system-records/plannerRejectRecorder.ts"
do
  [ -f "$f" ] && say "OK: $f" || die "Missing: $f"
done

say "verifying planner-rejects route file exists + server registration…"

ROUTE_FILE="apps/api/src/routes/system-records.planner-rejects.ts"
SERVER_FILE="apps/api/src/server.ts"

[ -f "$ROUTE_FILE" ] && say "OK: route file exists: $ROUTE_FILE" || say "WARN: missing route file: $ROUTE_FILE"
[ -f "$SERVER_FILE" ] && say "OK: server.ts exists" || die "Missing: $SERVER_FILE"

if rg -n "planner-rejects|system-records\.planner-rejects|PlannerRejects|plannerRejects" "$SERVER_FILE" >/dev/null 2>&1; then
  say "OK: server.ts appears to reference planner-rejects routing"
else
  say "WARN: server.ts does not obviously reference planner-rejects route (double-check registration)"
fi

# --- API Smoke (if API_PORT known) ------------------------------------------
if [ -n "${API_PORT:-}" ]; then
  say "smoking endpoint (expects 401 without bearer, 200 with bearer)…"
  URL_NOAUTH="http://${API_HOST}:${API_PORT}/api/system-records/planner-rejects?sessionDate=${SESSION_DATE}"
  URL_HEALTH="http://${API_HOST}:${API_PORT}/health"

  if have curl; then
    say "health: $URL_HEALTH"
    curl -fsS "$URL_HEALTH" >/dev/null && say "OK: /health 200" || say "WARN: /health not reachable"

    say "no-auth: $URL_NOAUTH"
    CODE_401="$(curl -sS -o /tmp/p1_3_noauth.out -w "%{http_code}" "$URL_NOAUTH" || true)"
    say "no-auth status: $CODE_401 (body in /tmp/p1_3_noauth.out)"

    say "with-auth (Bearer ${BEARER_TOKEN}): $URL_NOAUTH"
    CODE_200="$(curl -sS -o /tmp/p1_3_auth.out -w "%{http_code}" -H "Authorization: Bearer ${BEARER_TOKEN}" "$URL_NOAUTH" || true)"
    say "with-auth status: $CODE_200 (body in /tmp/p1_3_auth.out)"

    if [ "$CODE_401" != "401" ]; then
      say "WARN: expected 401 without bearer, got $CODE_401"
    fi
    if [ "$CODE_200" != "200" ]; then
      say "WARN: expected 200 with bearer, got $CODE_200"
    fi
  else
    say "WARN: curl not available; skipping smoke"
  fi
else
  say "WARN: API_PORT not inferred; skipping HTTP smoke (set API_PORT=<port> to enable)"
fi

# --- Tests -------------------------------------------------------------------
if [ "$RUN_TESTS" = "1" ]; then
  have pnpm || die "pnpm not found"
  say "running tests: pnpm -C apps/api test (auth disabled by default: BEARER_TOKEN unset)…"
  (unset BEARER_TOKEN; pnpm -C apps/api test)
  say "OK: tests passed"
else
  say "skipping tests (RUN_TESTS=0)"
fi

say "DONE: recon complete"
say "Notes:"
say " - To apply DB migration: run APPLY_MIGRATIONS=1 $0"
say " - To force smoke against a known port: API_PORT=3310 $0"
say " - To target a specific compose file: COMPOSE_FILE_HINT=docker-compose.v2.yml $0"
