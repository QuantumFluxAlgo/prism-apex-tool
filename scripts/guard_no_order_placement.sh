#!/usr/bin/env bash
set -euo pipefail

# Keywords associated with *executable* order placement. We intentionally keep
# the list tight to avoid flagging UI strings or telemetry fields.
PATTERN='place(Order|_order)|submit(Order|_order)|create(Order|_order)|sendOrder|executeOrder|orderId'

grep -RInE "$PATTERN" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.py' \
  --exclude-dir='docs' \
  --exclude-dir='tests' --exclude-dir='__tests__' --exclude='*.spec.*' --exclude='*.test.*' \
  --exclude-dir='examples' \
  --exclude-dir='node_modules' --exclude-dir='.git' \
  --exclude-dir='dist' --exclude-dir='build' --exclude-dir='apps/api/dist-cjs' \
  . > /tmp/guard-orders.log || exit 0

if [[ -s /tmp/guard-orders.log ]]; then
  echo "⚠️  Potential order placement keywords found in executable source. Review before deploying:" >&2
  cat /tmp/guard-orders.log >&2
  rm -f /tmp/guard-orders.log
  exit 1
fi

rm -f /tmp/guard-orders.log
