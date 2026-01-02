#!/usr/bin/env bash
# tools/node20-session-metrics.sh
#
# Convenience wrapper to:
#   - Build/update the Node 20 tool image
#   - Run the SessionMetrics Vitest suite in that image
#
# Usage:
#   ./tools/node20-session-metrics.sh

set -euo pipefail

IMAGE_NAME="prism-apex/node20-tool:1.0.0"

# Build (or rebuild) the tool image.
# This is cheap and ensures the image matches tools/node20-tool.Dockerfile.
echo ">>> Building Node 20 tool image: ${IMAGE_NAME}"
docker build -f tools/node20-tool.Dockerfile -t "${IMAGE_NAME}" .

# Run the SessionMetrics Vitest suite using the tool image.
# Assumes node_modules + pnpm-lock.yaml are already aligned on the host.
echo ">>> Running SessionMetrics Vitest in ${IMAGE_NAME}..."
docker run --rm -it \
  -v "$PWD":/app \
  -w /app \
  "${IMAGE_NAME}" \
  pnpm vitest apps/api/src/jobs/session-metrics/populate-session-metrics.test.ts --reporter=verbose
