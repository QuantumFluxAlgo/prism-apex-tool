#!/usr/bin/env bash
set -euo pipefail

# Mini demo: backtest ORB on sample ES data, write outputs to ./out
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
OUT_DIR="${ROOT_DIR}/out"
DATA="${ROOT_DIR}/data/ES_1m.sample.csv"

mkdir -p "$OUT_DIR"

echo "[DEMO] Building CLI (tsc)..."
npm run -w apps/cli build >/dev/null 2>&1 || true

echo "[DEMO] Running backtest (ORB) on sample data..."
"${ROOT_DIR}/node_modules/.bin/tsx" "${ROOT_DIR}/apps/cli/src/backtest.ts" \
  --strategy=ORB \
  --data="$DATA" \
  --mode=evaluation \
  --open=14:30 --close=21:59 \
  --tickValue=50 --seed=42 \
  --out="${OUT_DIR}/es_orb_sample"

echo "[DEMO] Results written to ${OUT_DIR}/es_orb_sample.json (and CSV files)"
