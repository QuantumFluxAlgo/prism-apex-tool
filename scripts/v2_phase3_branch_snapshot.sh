#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – BRANCH SNAPSHOT ZIP (SAFE NAME) ==="

REPO_ROOT="${PRISM_APEX_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT"

# Use current branch by default, or allow an override as $1
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
STAMP="$(date +%Y%m%d_%H%M%S)"

# Sanitize branch name for filesystem use:
# - replace slashes with dashes
# - replace spaces with underscores (belt-and-braces)
SAFE_BRANCH="${BRANCH//\//-}"
SAFE_BRANCH="${SAFE_BRANCH// /_}"

OUTPUT="prism-apex-tool_${SAFE_BRANCH}_${STAMP}.zip"

echo "Branch: $BRANCH"
echo "Output: $OUTPUT"

# Archive the actual branch ref, but write to the safe filename
git archive --format=zip --output "$OUTPUT" "$BRANCH"

echo "=== DONE: Snapshot written to $OUTPUT ==="
