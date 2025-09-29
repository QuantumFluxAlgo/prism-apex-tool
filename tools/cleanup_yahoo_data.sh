#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
TS="$(date -u +%Y%m%d%H%M%S)"
REPORT="$ROOT/docs/YAHOO_DATA_CLEANUP.md"
BACKUP_DIR="$ROOT/backups"
BACKUP="$BACKUP_DIR/yahoo-data-${TS}.tar.gz"

NAME_RE='(yahoo|yf|quote|quotes|ohlc|bars|candles|history|cache)'
EXT_RE='\.(csv|json|jsonl|ndjson|parquet|feather|arrow|sqlite|db)$'

is_in_scope() {
  case "$1" in
    data/*|.cache/*|cache/*|caches/*|tmp/*|apps/*/data/*|packages/*/data/*)
      return 0 ;;
    *)
      return 1 ;;
  esac
}

mkdir -p "$ROOT/docs" "$BACKUP_DIR"

# Gather untracked file list
CAND_UNTRACKED=()
while IFS= read -r -d '' rel; do
  [[ -z "$rel" ]] && continue
  # Skip directories (git won't output them)
  is_in_scope "$rel" || continue
  abs="$ROOT/$rel"
  [ -f "$abs" ] || continue
  base="${rel##*/}"
  shopt -s nocasematch
  if [[ "$base" =~ $NAME_RE ]] || [[ "$abs" =~ $EXT_RE ]]; then
    case "$rel" in
      backups/*|*.tar.gz|*.tgz) ;; # skip backups themselves
      *) CAND_UNTRACKED+=("$abs") ;;
    esac
  fi
  shopt -u nocasematch

done < <(git -C "$ROOT" ls-files --others --exclude-standard -z)

# Gather tracked candidates (report only)
CAND_TRACKED=()
while IFS= read -r -d '' rel; do
  [[ -z "$rel" ]] && continue
  is_in_scope "$rel" || continue
  abs="$ROOT/$rel"
  [ -f "$abs" ] || continue
  base="${rel##*/}"
  shopt -s nocasematch
  if [[ "$base" =~ $NAME_RE ]] || [[ "$abs" =~ $EXT_RE ]]; then
    CAND_TRACKED+=("$abs")
  fi
  shopt -u nocasematch

done < <(git -C "$ROOT" ls-files -z)

{
  echo "# Yahoo Data Cleanup (SAFE: untracked-only)"
  echo "- UTC: $(date -u '+%Y-%m-%d %H:%M:%S')"
  echo "- Backup (untracked set): \`backups/$(basename "$BACKUP")\`"
  echo
  echo "## Untracked candidates (backed up + removed)"
  if [ ${#CAND_UNTRACKED[@]} -eq 0 ]; then
    echo "_None_"
  else
    echo "| Size | Modified (UTC) | Path |"
    echo "|-----:|----------------|------|"
    for abs in "${CAND_UNTRACKED[@]}"; do
      [ -f "$abs" ] || continue
      sz=$(du -h "$abs" 2>/dev/null | awk '{print $1}')
      mt=$(date -u -r "$abs" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "?")
      rel="${abs#"$ROOT/"}"
      echo "| $sz | $mt | \`$rel\` |"
    done
  fi
  echo
  echo "## Tracked candidates (reported only; NOT removed)"
  if [ ${#CAND_TRACKED[@]} -eq 0 ]; then
    echo "_None_"
  else
    echo "| Size | Modified (UTC) | Path |"
    echo "|-----:|----------------|------|"
    for abs in "${CAND_TRACKED[@]}"; do
      [ -f "$abs" ] || continue
      sz=$(du -h "$abs" 2>/dev/null | awk '{print $1}')
      mt=$(date -u -r "$abs" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "?")
      rel="${abs#"$ROOT/"}"
      echo "| $sz | $mt | \`$rel\` |"
    done
  fi
} > "$REPORT"

if [ ${#CAND_UNTRACKED[@]} -eq 0 ]; then
  echo "No untracked Yahoo-style data to backup/remove."
  exit 0
fi

python3 - "$ROOT" "$BACKUP" "${CAND_UNTRACKED[@]}" <<'PY'
import os, sys, tarfile
root = os.path.abspath(sys.argv[1])
backup = os.path.abspath(sys.argv[2])
files = sys.argv[3:]
if not files:
    sys.exit(0)
os.makedirs(os.path.dirname(backup), exist_ok=True)
with tarfile.open(backup, 'w:gz') as tar:
    for f in files:
        if os.path.isfile(f):
            tar.add(f, arcname=os.path.relpath(f, root))
print(f"Backed up {len(files)} files to {backup}")
PY

for abs in "${CAND_UNTRACKED[@]}"; do
  rm -f -- "$abs"

done

{
  echo
  echo "## Post-clean verification"
  echo '```'
  for abs in "${CAND_UNTRACKED[@]}"; do
    rel="${abs#"$ROOT/"}"
    [ ! -f "$abs" ] && echo "$rel"
  done
  echo '```'
} >> "$REPORT"

echo "SAFE cleanup complete."
