#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

COMPOSE="docker-compose.v2.local.yml"

log()  { printf "\n[%s] %s\n" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"; }
fatal(){ echo "[FATAL] $*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || fatal "missing dependency: $1"; }

dc() { docker compose -f "$COMPOSE" "$@"; }

services_list() {
  dc config --services 2>/dev/null || true
}

have_service() {
  local s="$1"
  services_list | awk -v x="$s" '$0==x {found=1} END{exit found?0:1}'
}

detect_db_service() {
  if have_service postgres; then echo postgres; return 0; fi
  if have_service db; then echo db; return 0; fi
  local s
  for s in $(services_list); do
    local cid
    cid="$(dc ps -q "$s" 2>/dev/null || true)"
    [ -z "${cid:-}" ] && continue
    local img
    img="$(docker inspect -f '{{.Config.Image}}' "$cid" 2>/dev/null || true)"
    if echo "$img" | grep -qi 'postgres'; then
      echo "$s"
      return 0
    fi
  done
  echo postgres
}

detect_exposed_port() {
  local cid="$1";
  shift
  local ports_json ports want
  ports_json="$(docker inspect -f '{{json .Config.ExposedPorts}}' "$cid" 2>/dev/null || echo '{}')"
  ports="$(echo "$ports_json" | tr '{}' '\n' | tr ',' '\n' | sed -E 's/.*"([0-9]+)\/tcp".*/\1/' | awk '/^[0-9]+$/ {print}' | sort -n | uniq)"
  for want in "$@"; do
    if echo "$ports" | awk -v w="$want" '$0==w {found=1} END{exit found?0:1}'; then
      echo "$want"
      return 0
    fi
  done
  echo "$1"
}

kill_port_binders() {
  local port="$1"
  log "Port hygiene: ensuring port $port is free"
  local ids
  ids="$(docker ps --format '{{.ID}} {{.Ports}} {{.Names}}' | awk -v p=":$port->" '$0 ~ p {print $1}')"
  if [ -n "${ids:-}" ]; then
    echo "$ids" | while read -r id; do
      [ -z "$id" ] && continue
      log "Removing container binding $port: $id"
      docker rm -f "$id" >/dev/null 2>&1 || true
    done
  else
    log "No container binds $port"
  fi
}

write_roles_init_sql() {
  mkdir -p deploy/sql/init
  cat <<'SQL' > deploy/sql/init/001_roles.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex') THEN
    CREATE ROLE apex LOGIN PASSWORD 'apex' SUPERUSER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='prismapex') THEN
    CREATE ROLE prismapex LOGIN PASSWORD 'prismapex';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='prismapex') THEN
    CREATE DATABASE prismapex OWNER prismapex;
  END IF;
END $$;
GRANT ALL PRIVILEGES ON DATABASE prismapex TO prismapex;
GRANT ALL PRIVILEGES ON DATABASE prismapex TO apex;
SQL
}

backup() {
  need docker
  [ -f "$COMPOSE" ] || fatal "missing $COMPOSE"
  mkdir -p exports/backups
  if [ ! -f exports/backups/.gitignore ]; then
    cat <<'GITIGNORE' > exports/backups/.gitignore
*
!.gitignore
GITIGNORE
  fi
  local ts
  ts="$(date -u +'%Y%m%d_%H%M%S')"
  cp "$COMPOSE" "exports/backups/${COMPOSE}.${ts}.bak"
  log "Backed up compose -> exports/backups/${COMPOSE}.${ts}.bak"
  local db_svc
  db_svc="$(detect_db_service)"
  dc up -d "$db_svc" >/dev/null 2>&1
  local cid
  cid="$(dc ps -q "$db_svc" 2>/dev/null || true)"
  [ -n "${cid:-}" ] || fatal "db container not running"
  log "Waiting for Postgres readiness"
  for i in $(seq 1 60); do
    if docker exec "$cid" sh -lc 'pg_isready -d prismapex -U prismapex >/dev/null 2>&1 || pg_isready -d prismapex -U apex >/dev/null 2>&1'; then break; fi
    sleep 1
  done
  local out
  out="exports/backups/prismapex_${ts}.sql.gz"
  log "Dumping DB -> $out"
  if docker exec -i "$cid" sh -lc 'pg_dump -U prismapex -d prismapex' | gzip -9 > "$out"; then :; else docker exec -i "$cid" sh -lc 'pg_dump -U apex -d prismapex' | gzip -9 > "$out"; fi
  log "DB dump complete"
  echo "RESTORE: gunzip -c $out | docker exec -i $cid psql -U prismapex -d prismapex"
}

write_canonical_compose() {
  write_roles_init_sql
  cat <<'YML' > "$COMPOSE"
services:
  postgres:
    image: postgres:16
    container_name: prismapex-postgres
    environment:
      POSTGRES_DB: prismapex
      POSTGRES_USER: prismapex
      POSTGRES_PASSWORD: prismapex
    volumes:
      - prismapex_pgdata:/var/lib/postgresql/data
      - ./deploy/sql/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U prismapex -d prismapex"]
      interval: 5s
      timeout: 3s
      retries: 30
    restart: unless-stopped
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: prismapex-api
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: "3000"
      DATABASE_URL: "postgres://prismapex:prismapex@postgres:5432/prismapex"
      SESSION_WINDOWS_UTC: "${SESSION_WINDOWS_UTC:-14:30-21:00}"
      INGEST_YAHOO_SYMBOLS: "${INGEST_YAHOO_SYMBOLS:-ES=F,NQ=F,MES=F,MNQ=F,YM=F,RTY=F,GC=F,CL=F,6E=F,EURUSD=X,BTC-USD}"
      YAHOO_POLL_INTERVAL_MS: "${YAHOO_POLL_INTERVAL_MS:-45000}"
      YAHOO_POLL_LOOKBACK_MINUTES: "${YAHOO_POLL_LOOKBACK_MINUTES:-20}"
    restart: unless-stopped
  dashboard:
    build:
      context: .
      dockerfile: apps/dashboard/Dockerfile
      args:
        VITE_API_BASE: "/api"
    container_name: prismapex-dashboard
    environment:
      NODE_ENV: production
      VITE_API_BASE: "/api"
    depends_on:
      - api
    restart: unless-stopped
  ingress:
    image: nginx:1.27.5
    container_name: prismapex-ingress
    depends_on:
      - api
      - dashboard
    ports:
      - "5180:80"
    volumes:
      - ./deploy/ingress/local/default.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
volumes:
  prismapex_pgdata:
YML
  log "Canonical compose written"
}

write_ingress_config(){
  mkdir -p deploy/ingress/local
  local dash_cid api_cid dash_port api_port
  api_cid="$(dc ps -q api 2>/dev/null || true)"
  dash_cid="$(dc ps -q dashboard 2>/dev/null || true)"
  [ -n "${api_cid:-}" ] || fatal "api container missing"
  [ -n "${dash_cid:-}" ] || fatal "dashboard container missing"
  api_port="3000"
  dash_port="$(docker inspect -f '{{json .Config.ExposedPorts}}' "$dash_cid" 2>/dev/null | tr '{}' '\n' | tr ',' '\n' | sed -E 's/.*"([0-9]+)\/tcp".*/\1/' | awk '/^[0-9]+$/ {print}' | head -n1)"
  [ -n "${dash_port:-}" ] || dash_port="80"
  log "Ingress will proxy api:${api_port}, dashboard:${dash_port}"
  cat <<'NGINXC' > deploy/ingress/local/default.conf
log_format prismapex '\$remote_addr - \$host "\$request" \$status up=\$upstream_addr upst=\$upstream_status rt=\$request_time urt=\$upstream_response_time';
access_log /dev/stdout prismapex;
error_log  /dev/stderr info;
server {
  listen 80;
  add_header X-PrismApex-Ingress "prismapex-5180" always;
  location = /ui-meta {add_header Cache-Control "no-store" always; default_type application/json; return 200 '{"ingress":"prismapex-5180","api_upstream":"api:${api_port}","dashboard_upstream":"dashboard:${dash_port}"}';}
  location = /healthz {default_type application/json; return 200 '{"ok":true}';}
  proxy_intercept_errors on;
  error_page 502 503 504 = @upstream_error;
  location @upstream_error {default_type application/json; add_header Cache-Control "no-store" always; return 200 '{"ingress":"prismapex-5180","error":"upstream","upstream_addr":"\$upstream_addr","upstream_status":"\$upstream_status"}';}
  location /api/ {add_header X-PrismApex-ApiProxy "1" always; proxy_pass http://api:${api_port}; proxy_set_header Host \$host; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; proxy_http_version 1.1; proxy_read_timeout 60s; proxy_connect_timeout 5s;}
  location = /health {proxy_pass http://api:${api_port}/health;}
  location / { add_header Cache-Control "no-store" always; proxy_pass http://dashboard:${dash_port}; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; proxy_read_timeout 60s; proxy_connect_timeout 5s; }
}
NGINXC
}

apply(){
  need docker
  kill_port_binders 5180
  kill_port_binders 8180
  dc down --remove-orphans >/dev/null 2>&1 || true
  write_canonical_compose
  dc up -d --build postgres api dashboard
  write_ingress_config
  dc up -d --force-recreate ingress
  dc ps
}

verify(){
  need curl
  for path in /ui-meta /health /api/tickets /api/worklist; do
    log "verify $path"
    code=$(curl -sS -o /tmp/tmp.out -w '%{http_code}' http://127.0.0.1:5180$path || true)
    echo "$path -> $code"
    head -n5 /tmp/tmp.out
  done
}

tests(){
  env -u BEARER_TOKEN pnpm -C apps/api test
}

case "${1:-all}" in
  backup) backup;;
  apply) apply;;
  verify) verify;;
  tests) tests;;
  all) backup; apply; verify; tests;;
  *) fatal "usage";;
 esac
