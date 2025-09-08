#!/usr/bin/env bash
set -euo pipefail

# Config (override by env): SRC_BRANCH=<your_local_branch> DEST_BRANCH=test MODE=merge|reset
SRC_BRANCH="${SRC_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
DEST_BRANCH="${DEST_BRANCH:-test}"
MODE="${MODE:-merge}" # merge (default) or reset (force update)

echo "== Aligning remote '${DEST_BRANCH}' to local '${SRC_BRANCH}' (mode=${MODE}) =="

# Guard: ensure clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes. Commit or stash before running." >&2
  exit 1
fi

# Fetch everything
git fetch --all --prune

# Create a remote backup of current DEST (if it exists)
if git show-ref --verify --quiet "refs/remotes/origin/${DEST_BRANCH}"; then
  BAK="${DEST_BRANCH}-backup-$(date +%Y%m%d-%H%M%S)"
  echo "Creating remote backup branch: ${BAK}"
  git branch -f "${BAK}" "origin/${DEST_BRANCH}" >/dev/null
  git push -u origin "refs/heads/${BAK}:refs/heads/${BAK}"
fi

if [[ "${MODE}" == "merge" ]]; then
  # Non-destructive merge: origin/${DEST} <- ${SRC_BRANCH}
  echo "Merging ${SRC_BRANCH} -> ${DEST_BRANCH}"
  git switch "${DEST_BRANCH}" 2>/dev/null || git switch -c "${DEST_BRANCH}"
  git merge --no-ff "${SRC_BRANCH}" -m "Merge ${SRC_BRANCH} → ${DEST_BRANCH} (align local working)"
  git push -u origin "${DEST_BRANCH}"
else
  # Force-align: set remote DEST to exactly SRC commit
  echo "Force-updating origin/${DEST_BRANCH} to ${SRC_BRANCH} (with --force-with-lease)"
  git push --force-with-lease origin "${SRC_BRANCH}:refs/heads/${DEST_BRANCH}"
  # Make local DEST track it too
  if git show-ref --verify --quiet "refs/heads/${DEST_BRANCH}"; then
    git switch "${DEST_BRANCH}"
    git reset --hard "origin/${DEST_BRANCH}"
  else
    git switch -c "${DEST_BRANCH}" "origin/${DEST_BRANCH}"
  fi
fi

echo "== Done. Current pointers =="
git --no-pager log --oneline -n 1 "${SRC_BRANCH}"
git --no-pager log --oneline -n 1 "origin/${DEST_BRANCH}"
