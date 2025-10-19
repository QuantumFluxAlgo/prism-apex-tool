#!/usr/bin/env bash
set -euo pipefail

hr(){ printf '\n%s\n\n' '---'; }
kv(){ printf ' - %s: %s\n' "$1" "$2"; }

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "# Prism-Apex Smoke — Yahoo→DB→Ticket→API"

# 1) pick free ports if not provided
pick_port() {
  local want="$1"
  if command -v nc >/dev/null 2>&1 && ! nc -z localhost "$want" >/dev/null 2>&1; then
    echo "$want"; return
  fi
  python3 - <<PY
import socket
start=$want
for p in range(start, start+300):
    with socket.socket() as s:
        try:
            s.bind(("127.0.0.1", p))
        except OSError:
            continue
        print(p); break
PY
}

export PGHOSTPORT="${PGHOSTPORT:-$(pick_port 55433)}"
export POSTGRES_PORT="$PGHOSTPORT"
export API_PORT="${API_PORT:-$(pick_port 3000)}"
kv "PGHOSTPORT" "$PGHOSTPORT"
kv "API_PORT" "$API_PORT"
hr

# 2) boot DB + API
docker compose --profile local up -d db || true
sleep 3
docker compose --profile local up -d api || true
sleep 4

# 3) probe API health
echo "Probing API /health…"
set +e
HEALTH="$(curl -sfS "http://localhost:${API_PORT}/health" || true)"
set -e
echo "${HEALTH:-"(no response)"}"
hr
[ -n "$HEALTH" ] || { echo "❌ API not responding on :$API_PORT"; exit 1; }

# 4) prove Yahoo native reachable
echo "Yahoo reachability check (ES=F last day)…"
curl -sfS "https://query1.finance.yahoo.com/v8/finance/chart/ES=F?range=1d&interval=1m" | head -c 200 >/dev/null \
  && echo "✅ Yahoo chart endpoint reachable" \
  || { echo "❌ Yahoo endpoint not reachable"; exit 2; }
hr

# 5) emit a SMOKE ticket (tickets-only)
TICKDIR="tickets"
mkdir -p "$TICKDIR"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
TICKET_FILE="$TICKDIR/smoke.jsonl"
cat >> "$TICKET_FILE" <<JSON
{"ts":"$TS","instrument":"ES","symbol":"ES=F","side":"flat","size":0,"reason":"SMOKE","tag":"SMOKE","note":"local smoke ticket"}
JSON
echo "Ticket appended → $TICKET_FILE"
tail -n 1 "$TICKET_FILE"
hr

# 6) best-effort tickets endpoint
echo "Probing /tickets (best-effort)…"
set +e
curl -sfS "http://localhost:${API_PORT}/tickets" | head -c 400 && echo || echo "(no /tickets or not exposed)"
set -e
hr

echo "✅ Smoke completed. Summary:"
kv "API /health" "OK"
kv "Yahoo chart" "OK"
kv "Ticket emitted" "$TICKET_FILE (tag=SMOKE)"
