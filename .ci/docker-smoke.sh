#!/usr/bin/env bash
set -euo pipefail
if ! docker info >/dev/null 2>&1; then
  echo "⚠️  Docker daemon not available — skipping docker build smoke (non-blocking)."
  exit 0
fi
echo "🐳 Docker daemon detected — building image…"
docker build -t prism-apex:ci .
echo "✅ Docker build completed."
exit 0
