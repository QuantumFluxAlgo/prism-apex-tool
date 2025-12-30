#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APP_PATH="$ROOT/apps/dashboard/src/App.tsx"

echo "=== PRISM APEX — ENSURE WORKLIST V2 ROUTE IN App.tsx ==="
echo "App file: $APP_PATH"
echo

if [ ! -f "$APP_PATH" ]; then
  echo "ERROR: App.tsx not found at $APP_PATH" >&2
  exit 1
fi

APP_PATH="$APP_PATH" python3 << 'PY'
import os
from pathlib import Path

app_path = Path(os.environ["APP_PATH"])
text = app_path.read_text(encoding="utf-8")
original = text

lines = text.splitlines()

def ensure_import(symbol: str, import_line: str):
  global lines
  joined = "\n".join(lines)
  if symbol in joined:
    return
  # find last import line
  import_indices = [i for i, line in enumerate(lines) if line.strip().startswith("import ")]
  if not import_indices:
    # no imports? prepend
    lines = [import_line, ""] + lines
    return
  insert_idx = max(import_indices) + 1
  lines.insert(insert_idx, import_line)

# 1) Ensure imports
ensure_import("ExecutionShell", 'import ExecutionShell from "./layouts/ExecutionShell";')
ensure_import("WorklistV2Page", 'import WorklistV2Page from "./pages/WorklistV2";')

text = "\n".join(lines)

# 2) Ensure route for /worklist-v2 wrapped in ExecutionShell
if 'path="/worklist-v2"' not in text and "path='/worklist-v2'" not in text:
  marker = "</Routes>"
  idx = text.find(marker)
  if idx == -1:
    # no <Routes> block? leave file unchanged but warn
    print("WARNING: </Routes> not found in App.tsx; did not add Worklist V2 route.")
  else:
    route_block = (
        '        <Route '
        'path="/worklist-v2" '
        'element={<ExecutionShell activeTab="worklist"><WorklistV2Page /></ExecutionShell>} />\n'
    )
    text = text[:idx] + route_block + text[idx:]

if text != original:
  app_path.write_text(text, encoding="utf-8")
  print("UPDATED: App.tsx modified to ensure Worklist V2 route.")
else:
  print("NO CHANGE: App.tsx already imports and routes Worklist V2 via ExecutionShell (or could not safely modify).")
PY

echo
echo "=== Diff (App.tsx) ==="
git diff -- apps/dashboard/src/App.tsx || true
echo
echo "=== DONE: Worklist V2 route check complete. ==="
