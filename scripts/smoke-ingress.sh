#!/usr/bin/env bash
set -euo pipefail

# Ensure Docker daemon is running
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker daemon not available. Start Docker Desktop or dockerd and retry." >&2
  exit 1
fi

# Prepare env file
if [ ! -f ".env.ingress" ]; then
  cp .env.ingress.example .env.ingress
  echo "ℹ️  Created .env.ingress from example (defaults enabled)."
fi

# Build image (uses microservice Dockerfile)
echo "🐳 Building image prism-apex:ingress-dev…"
docker build -t prism-apex:ingress-dev -f apps/ingress-yahoo-dev/Dockerfile .

# Up service
echo "🚀 Starting compose service…"
docker compose --profile local up -d ingress-yahoo

# Health check
echo "⏳ Waiting for /health…"
for i in {1..20}; do
  sleep 0.5
  if curl -sf http://localhost:8080/health >/dev/null; then
    echo "✅ Health OK"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "❌ Health endpoint not responding" >&2
    docker compose --profile local logs --no-log-prefix ingress-yahoo || true
    exit 1
  fi
  done

# Post prior-day bar to seed prior-high
echo "→ Seeding prior-day bar…"
curl -s -X POST http://localhost:8080/ingress/yahoo/v1/bar \
  -H "Content-Type: application/json" \
  -H "x-apex-secret: ${APEX_YAHOO_SHARED_SECRET:-s3cr3t}" \
  --data-binary @scripts/samples/esf-prior.json | jq -C .

# Post today bar to trigger plan/ticket
echo "→ Posting today bar…"
curl -s -X POST http://localhost:8080/ingress/yahoo/v1/bar \
  -H "Content-Type: application/json" \
  -H "x-apex-secret: ${APEX_YAHOO_SHARED_SECRET:-s3cr3t}" \
  --data-binary @scripts/samples/esf-today.json | tee /tmp/ingress-resp.json | jq -C .

echo
echo "📄 Tickets directory:"
ls -1 tickets || true
echo
echo "📄 Today’s tickets:"
TODAY=$(date -u +%F)
ls -1 "tickets/${TODAY}" 2>/dev/null || echo "(none yet)"
echo
echo "Done."
