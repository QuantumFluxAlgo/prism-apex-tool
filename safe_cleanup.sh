#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="${DRY_RUN:-1}"
AUTO_YES="${AUTO_YES:-0}"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

LOG_PATH="$ROOT/docs/YAHOO_DATA_CLEANUP.md"
mkdir -p "$(dirname "$LOG_PATH")"
touch "$LOG_PATH"

SUMMARY_LINES=()

say() {
  printf '%s\n' "$*"
  SUMMARY_LINES+=("$*")
}

flush_log() {
  if [ "${#SUMMARY_LINES[@]}" -eq 0 ]; then
    return 0
  fi
  {
    printf '## %s\n' "$(date -Iseconds)"
    printf '%s\n' "${SUMMARY_LINES[@]}"
    printf '\n'
  } >> "$LOG_PATH"
}
trap flush_log EXIT

in_scope() {
  case "$1" in
    backups/*|data/*|.cache/*|cache/*|caches/*|tmp/*|coverage/*|.next/*|.vercel/*|.turbo/*|build/*) return 0 ;;
    *) return 1 ;;
  esac
}

UNTRACKED=()
while IFS= read -r -d '' rel; do
  UNTRACKED+=("$rel")
done < <(git ls-files --others --exclude-standard -z || true)

CAND_FILES=()
for rel in "${UNTRACKED[@]+"${UNTRACKED[@]}"}"; do
  [ -n "$rel" ] || continue
  in_scope "$rel" || continue
  [ -f "$rel" ] || continue
  CAND_FILES+=("$rel")
done

CAND_DIRS=()
for d in coverage .nyc_output .pytest_cache .ruff_cache .mypy_cache .turbo .next .vercel build; do
  [ -d "$d" ] || continue
  if git ls-files -- "$d" | grep -q .; then
    continue
  fi
  CAND_DIRS+=("$d")
done

say "=== SAFE CLEANUP (UNTRACKED ONLY) ==="
say "Git root: $ROOT"
say "Dry run: $DRY_RUN"
say ""
say "-- Files to delete (untracked, in allow-listed dirs): ${#CAND_FILES[@]}"
if [ "${#CAND_FILES[@]}" -gt 0 ]; then
  for rel in "${CAND_FILES[@]+"${CAND_FILES[@]}"}"; do
    say "  - $rel"
  done
else
  say "  (none)"
fi
say ""
say "-- Directories to delete recursively (build caches): ${#CAND_DIRS[@]}"
if [ "${#CAND_DIRS[@]}" -gt 0 ]; then
  for d in "${CAND_DIRS[@]+"${CAND_DIRS[@]}"}"; do
    say "  - $d"
  done
else
  say "  (none)"
fi

if [ "$AUTO_YES" != "1" ] && [ "$DRY_RUN" != "1" ] && [ -t 0 ]; then
  if ! read -r -p "Proceed with this plan? [y/N] " ans; then
    say "No confirmation provided; aborted."
    exit 0
  fi
  case "$ans" in
    y|Y) : ;;
    *)
      say "Aborted."
      exit 0
      ;;
  esac
else
  say "(auto-continue: dry-run or AUTO_YES set or non-interactive)"
fi

if [ "$DRY_RUN" = "1" ]; then
  say "[DRY-RUN] No deletions performed."
  exit 0
fi

for f in "${CAND_FILES[@]+"${CAND_FILES[@]}"}"; do
  [ -f "$f" ] && rm -f -- "$f" && say "deleted $f"
done
for d in "${CAND_DIRS[@]+"${CAND_DIRS[@]}"}"; do
  rm -rf -- "$d" && say "removed dir $d"
done

for d in backups data .cache cache caches tmp coverage .next .vercel .turbo build; do
  [ -d "$d" ] || continue
  if [ -z "$(find "$d" -mindepth 1 -print -quit 2>/dev/null)" ]; then
    rmdir "$d" && say "rmdir $d (empty)"
  fi
done

say "Done."
