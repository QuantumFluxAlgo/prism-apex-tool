#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
REPORT="$ROOT/docs/CLEANUP_REPORT.md"
DATE_TAG="$(date +%Y%m%d)"
ATTIC="$ROOT/archive/ATTIC-$DATE_TAG"
DRY="${CLEANUP_DRY_RUN:-0}"
ARCHIVE="${ARCHIVE_MODE:-0}"
MAX_MB="${CLEANUP_MAX_SIZE_MB:-50}"

mkdir -p "$ROOT/docs"

cd "$ROOT"

# track seen paths to avoid duplicate processing

log(){ printf '%s\n' "$*"; }
hr(){ printf '---\n'; }

is_protected(){
  local rel="$1"
  [[ "$rel" == . ]] && return 0
  [[ "$rel" == "" ]] && return 0
  # normalize leading ./
  rel="${rel#./}"
  [[ "$rel" =~ ^(apps|packages|src|services)(/|$) ]] && return 0
  [[ "$rel" =~ ^(configs|config)(/|$) ]] && return 0
  [[ "$rel" =~ ^migrations(/|$) ]] && return 0
  [[ "$rel" =~ ^tickets/.*\.jsonl$ ]] && return 0
  [[ "$rel" =~ ^\.env ]] && return 0
  [[ "$rel" =~ ^node_modules(/|$) ]] && return 0
  [[ "$rel" =~ ^\.pnpm-store(/|$) ]] && return 0
  [[ "$rel" =~ ^\.git(/|$) ]] && return 0
  return 1
}

ensure_attic(){
  if [[ "$ARCHIVE" == "1" ]]; then
    mkdir -p "$ATTIC"
  fi
}

stage_delete(){
  local rel="$1"
  local abs="$ROOT/${rel#./}"
  [[ -e "$abs" || -d "$abs" || -L "$abs" ]] || return 0
  if [[ "$DRY" == "1" ]]; then
    return 0
  fi
  if [[ "$ARCHIVE" == "1" ]]; then
    ensure_attic
    local target="$ATTIC/${rel#./}"
    mkdir -p "$(dirname "$target")"
    if git ls-files --error-unmatch "${rel#./}" >/dev/null 2>&1; then
      mkdir -p "$(dirname "$target")"
      git mv -f "${rel#./}" "$target"
    else
      mv -f "$abs" "$target"
    fi
  else
    if git ls-files --error-unmatch "${rel#./}" >/dev/null 2>&1; then
      git rm -rf --quiet --ignore-unmatch "${rel#./}" || true
    fi
    rm -rf "$abs"
  fi
}

human(){
  python3 - "$1" <<'PY'
import sys
value=float(sys.argv[1])
units=["B","KB","MB","GB","TB"]
idx=0
while value >= 1024 and idx < len(units)-1:
    value/=1024
    idx+=1
print(f"{value:.2f} {units[idx]}")
PY
}

size_bytes(){
  python3 - "$ROOT" <<'PY'
import os, sys
root=sys.argv[1]
total=0
for base, _, files in os.walk(root):
    if '/.git/' in base:
        continue
    for fname in files:
        fpath=os.path.join(base, fname)
        try:
            total += os.path.getsize(fpath)
        except OSError:
            pass
print(total)
PY
}

SIZE_BEFORE=$(size_bytes)
HUM_BEFORE=$(human "$SIZE_BEFORE")

{
  echo "# Cleanup Report"
  echo
  echo "- Timestamp: $(date -Iseconds)"
  if [[ "$DRY" == "1" ]]; then
    echo "- Mode: DRY-RUN"
  elif [[ "$ARCHIVE" == "1" ]]; then
    echo "- Mode: ARCHIVE"
  else
    echo "- Mode: DELETE"
  fi
  echo "- Large file threshold: ${MAX_MB}MB"
  echo
  echo "## Removed Paths"
} > "$REPORT"

consume_scan_list(){
  local file="$1"
  local tag="$2"
  [[ -f "$file" ]] || return 0
  python3 - "$file" <<'PY' | while IFS= read -r rel; do
import json,sys
path=sys.argv[1]
try:
    data=json.load(open(path))
except Exception:
    sys.exit(0)
if isinstance(data,list):
    for item in data:
        if isinstance(item,str):
            print(item)
        elif isinstance(item,dict) and 'path' in item:
            print(item['path'])
PY
    [[ -z "$rel" ]] && continue
    rel="${rel#./}"
    [[ -e "$ROOT/$rel" || -L "$ROOT/$rel" ]] || continue
    if ! is_protected "$rel"; then
      printf "%s\n" "- (scan:$tag) $rel" >> "$REPORT"
      stage_delete "$rel"
    fi
  done
}


# directory patterns
find . -type d   \( -name "__pycache__"     -o -name ".ipynb_checkpoints"     -o -name ".pytest_cache"     -o -name ".mypy_cache"     -o -name ".ruff_cache"     -o -name "logs"     -o -name "dist"     -o -name "build"     -o -name ".tmp"     -o -name "tmp"     -o -name "temp"     -o -name "dump"     -o -name "dumps" \)   -print | while IFS= read -r dir; do
  rel="${dir#./}"
  [[ -n "$rel" ]] || continue
  if ! is_protected "$rel"; then
    printf "%s\n" "- (pattern-dir) $rel" >> "$REPORT"
    stage_delete "$rel"
  fi
done

# file patterns
find . -type f   \( -name "*.log"     -o -name "*.sqlite"     -o -name "*.db"     -o -name "*.pid" \)   -print | while IFS= read -r file; do
  rel="${file#./}"
  [[ -n "$rel" ]] || continue
  if ! is_protected "$rel"; then
    printf "%s\n" "- (pattern-file) $rel" >> "$REPORT"
    stage_delete "$rel"
  fi
done

# explicit compiled output path
if [[ -d "apps/api/dist-cjs" ]]; then
  if ! is_protected "apps/api/dist-cjs"; then
    printf "%s\n" "- (pattern-explicit) apps/api/dist-cjs" >> "$REPORT"
    stage_delete "apps/api/dist-cjs"
  fi
fi


# large loose files fallback
find . -type f -size +"${MAX_MB}"M -print0 | while IFS= read -r -d '' file; do
  rel="${file#./}"
  if is_protected "$rel"; then
    continue
  fi
  case "$rel" in
    node_modules/*|.pnpm-store/*) continue ;;
  esac
  printf "%s\n" "- (large) $rel" >> "$REPORT"
  stage_delete "$rel"
done

SIZE_AFTER=$(size_bytes)
HUM_AFTER=$(human "$SIZE_AFTER")
DELTA=$(( SIZE_BEFORE - SIZE_AFTER ))
[[ $DELTA -lt 0 ]] && DELTA=0
HUM_DELTA=$(human "$DELTA")

{
  echo
  echo "## Disk Usage"
  echo "- Before: $HUM_BEFORE ($SIZE_BEFORE bytes)"
  echo "- After : $HUM_AFTER ($SIZE_AFTER bytes)"
  echo "- Saved : $HUM_DELTA ($DELTA bytes)"
  echo
  echo "## Notes"
  echo "- tickets/*.jsonl, source trees, configs, migrations, and .env* were left untouched."
  echo "- Set CLEANUP_DRY_RUN=1 to preview or ARCHIVE_MODE=1 to move clutter into archive/ATTIC-<date>."
  echo "- No automated order placement or liquidation paths were introduced."
} >> "$REPORT"

log "Cleanup complete. See $REPORT"
