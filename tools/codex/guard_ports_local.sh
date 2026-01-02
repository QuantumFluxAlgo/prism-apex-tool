#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
fail(){ echo "[GUARD][FAIL] $*" >&2; exit 1; }
ok(){ echo "[GUARD][OK]   $*"; }
[ -f docker-compose.v2.local.yml ] || fail "missing docker-compose.v2.local.yml"
[ -f deploy/ingress/local/default.conf ] || fail "missing ingress config"
if rg -n --no-messages '(3000:|8080:|8180:|5173:|5432:|55433:)' docker-compose.v2.local.yml >/dev/null; then
  fail "docker-compose.v2.local.yml exposes forbidden host ports"
fi
ok "no forbidden host ports"
if rg -n --no-messages 'localhost:3000|127\.0\.0\.1:3000' docker-compose.v2.local.yml LOCAL_DEV.md PORTS.md DOCKER_COMPOSE.md >/dev/null; then
  fail "Found localhost:3000 references"
fi
ok "no localhost:3000 references"
if rg -n --no-messages '\$\{api_port\}|\$\{dash_port\}|api_port|dash_port' deploy/ingress/local/default.conf >/dev/null; then
  fail "nginx config has placeholder upstreams"
fi
ok "nginx config is concrete"
ok "guard_ports_local finished"
