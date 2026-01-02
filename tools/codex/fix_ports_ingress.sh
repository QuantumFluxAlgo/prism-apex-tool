#!/usr/bin/env bash
set -euo pipefail

PHASE="${1:-all}"
TS="$(date +%Y%m%d_%H%M%S)"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

COMPOSE="${COMPOSE_FILE:-docker-compose.v2.local.yml}"
BACKUP_DIR="exports/backups"
DB_DUMP="$BACKUP_DIR/prismapex_${TS}.sql.gz"
COMPOSE_BAK="$BACKUP_DIR/${COMPOSE}.${TS}.bak"

fatal() {
  echo "[FATAL] $*" >&2
  exit 1
}

have() { command -v "$1" >/dev/null 2>&1; }

dc() { docker compose -f "$COMPOSE" "$@"; }

services_list() {
  dc config --services 2>/dev/null || true
}

detect_db_service() {
  local svcs
  svcs="$(services_list)"
  if echo "$svcs" | grep -qx "db"; then
    echo "db"
    return 0
  fi
  if echo "$svcs" | grep -qx "postgres"; then
    echo "postgres"
    return 0
  fi
  while IFS=$'\t' read -r svc img; do
    if echo "$img" | grep -qiE 'postgres'; then
      echo "$svc"
      return 0
    fi
  done < <(dc ps --format '{{.Service}}\t{{.Image}}' 2>/dev/null || true)
  return 1
}

kill_conflicting_ports() {
  local ports=(8180 8080 3000 5432)
  for p in "${ports[@]}"; do
    local owners
    owners="$(docker ps --format '{{.Names}}\t{{.Ports}}' | awk -v port=":${p}->" '$0 ~ port {print}')"
    if [ -n "${owners:-}" ]; then
      echo "[WARN] host port $p bound by:"
      echo "$owners" | sed 's/^/  - /'
      echo "[ACTION] removing containers binding $p (volumes preserved)"
      echo "$owners" | awk '{print $1}' | while read -r name; do
        docker rm -f "$name" >/dev/null 2>&1 || true
      done
    fi
  done
}

wait_for_db() {
  local svc="$1"
  echo "  - waiting for DB readiness"
  for i in $(seq 1 60); do
    if dc exec -T "$svc" pg_isready -U prismapex -d prismapex >/dev/null 2>&1; then
      return 0
    fi
    if dc exec -T "$svc" pg_isready -U apex -d prismapex >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
done
  dc logs --tail=200 "$svc" || true
  fatal "DB service $svc never became ready"
}

choose_user() {
  local svc="$1"
  if dc exec -T "$svc" psql -U prismapex -d prismapex -c "select 1" >/dev/null 2>&1; then
    echo "prismapex"
  else
    echo "apex"
  fi
}

ensure_dirs() {
  mkdir -p "$BACKUP_DIR" deploy/ingress/local tools/codex
  if [ ! -f "$BACKUP_DIR/.gitignore" ]; then
    cat > "$BACKUP_DIR/.gitignore" <<'GITIGNORE'
*
!.gitignore
GITIGNORE
  fi
}

backup_db() {
  echo "[1/5] Backup DB"
  ensure_dirs
  [ -f "$COMPOSE" ] || fatal "compose file $COMPOSE missing"
  cp -f "$COMPOSE" "$COMPOSE_BAK"
  echo "  - compose backup: $COMPOSE_BAK"
  local db_svc
  if ! db_svc="$(detect_db_service)"; then
    echo "  - services:"
    services_list | sed 's/^/    - /'
    dc ps || true
    fatal "could not detect postgres/db service"
  fi
  echo "  - db service: $db_svc"
  dc up -d "$db_svc" >/dev/null 2>&1
  wait_for_db "$db_svc"
  local dump_user
  dump_user="$(choose_user "$db_svc")"
  echo "  - dump user: $dump_user"
  echo "  - dumping -> $DB_DUMP"
  dc exec -T "$db_svc" pg_dump -U "$dump_user" -d prismapex --no-owner --no-privileges \
    | gzip -c > "$DB_DUMP"
  echo "  - ok: $DB_DUMP"
  echo "  - restore with: gunzip -c $DB_DUMP | dc exec -T $db_svc psql -U $dump_user -d prismapex"
}

write_ingress_conf() {
  echo "[2/5] Write nginx ingress config"
  ensure_dirs
  cat > deploy/ingress/local/default.conf <<'NGINX'
server {
  listen 80;
  server_name _;

  location = /healthz {
    add_header Content-Type text/plain;
    return 200 "ok\n";
  }

  location = /health {
    proxy_pass http://api:3000/health;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location ^~ /api/ {
    proxy_pass http://api:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Connection "";
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
  }

  location / {
    proxy_pass http://dashboard:8080/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Connection "";
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
NGINX
}

rewrite_compose_canonical() {
  echo "[3/5] Rewrite canonical compose"
  ensure_dirs
  cat > "$COMPOSE" <<'YAML'
services:
  postgres:
    image: postgres:16
    container_name: prismapex-postgres
    environment:
      POSTGRES_DB: prismapex
      POSTGRES_USER: prismapex
      POSTGRES_PASSWORD: prismapex
    ports:
      - "5432:5432"
    volumes:
      - prismapex_pgdata:/var/lib/postgresql/data
      - ./deploy/sql/init:/docker-entrypoint-initdb.d:ro
    networks:
      default:
        aliases:
          - db
          - postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U prismapex -d prismapex"]
      interval: 5s
      timeout: 3s
      retries: 20
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
      DATABASE_URL: "postgres://prismapex:prismapex@db:5432/prismapex"
      SESSION_WINDOWS_UTC: "${SESSION_WINDOWS_UTC:-14:30-21:00}"
      INGEST_YAHOO_SYMBOLS: "${INGEST_YAHOO_SYMBOLS:-ES=F,NQ=F,MES=F,MNQ=F,YM=F,RTY=F,GC=F,CL=F,6E=F,EURUSD=X,BTC-USD}"
      YAHOO_POLL_INTERVAL_MS: "${YAHOO_POLL_INTERVAL_MS:-45000}"
      YAHOO_POLL_LOOKBACK_MINUTES: "${YAHOO_POLL_LOOKBACK_MINUTES:-20}"
    ports:
      - "3000:3000"
    restart: unless-stopped
  dashboard:
    build:
      context: .
      dockerfile: apps/dashboard/Dockerfile
    container_name: prismapex-dashboard
    environment:
      NODE_ENV: production
      VITE_API_BASE: "${VITE_API_BASE:-}"
    ports:
      - "8080:8080"
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
      - "8180:80"
    volumes:
      - ./deploy/ingress/local/default.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
volumes:
  prismapex_pgdata:
YAML
}

up_and_verify() {
  echo "[4/5] Bring up canonical stack"
  kill_conflicting_ports
  dc up -d --build
  echo "  - waiting for ingress /healthz"
  for i in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:8180/healthz" >/dev/null 2>&1; then
      break
    fi
    sleep 1
done
  echo "  - edge checks"
  set +e
  echo "    /healthz -> $(curl -s -o /tmp/healthz.out -w '%{http_code}' http://127.0.0.1:8180/healthz)"; cat /tmp/healthz.out; echo
  echo "    /health  -> $(curl -s -o /tmp/health.out  -w '%{http_code}' http://127.0.0.1:8180/health)";  cat /tmp/health.out;  echo
  echo "    /api/worklist -> $(curl -s -o /tmp/worklist.out -w '%{http_code}' http://127.0.0.1:8180/api/worklist)"; head -c 400 /tmp/worklist.out; echo
  echo "    /api/tickets  -> $(curl -s -o /tmp/tickets.out  -w '%{http_code}' http://127.0.0.1:8180/api/tickets)";  head -c 400 /tmp/tickets.out; echo
  set -e
  echo "  - logs"
  docker logs --tail=120 prismapex-ingress || true
  docker logs --tail=200 prismapex-api || true
}

run_tests() {
  echo "[5/5] Run API tests"
  if have pnpm; then
    env -u BEARER_TOKEN pnpm -C apps/api test
  else
    echo "[WARN] pnpm missing; skipping tests."
  fi
}

case "$PHASE" in
  backup) backup_db ;;
  config) write_ingress_conf; rewrite_compose_canonical ;;
  up) up_and_verify ;;
  test) run_tests ;;
  all)
    backup_db
    write_ingress_conf
    rewrite_compose_canonical
    up_and_verify
    run_tests
    ;;
  *)
    echo "usage: $0 {backup|config|up|test|all}"
    exit 2
    ;;
esac

echo "[DONE] phase=$PHASE"
