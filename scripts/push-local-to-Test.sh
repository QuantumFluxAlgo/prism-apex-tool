#!/usr/bin/env bash
set -euo pipefail

SRC_BRANCH="${SRC_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
DEST_BRANCH="${DEST_BRANCH:-Test}"
MESSAGE="${MESSAGE:-chore: align Test to local ${SRC_BRANCH}}"

echo "== Using SRC=${SRC_BRANCH} -> DEST=${DEST_BRANCH} =="

# Commit pending changes if any (bypass husky if needed)
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  HUSKY=0 git commit -m "$MESSAGE" || git commit -m "$MESSAGE" --no-verify
fi

git fetch --all --prune

# Remote backup of current DEST
if git show-ref --verify --quiet "refs/remotes/origin/${DEST_BRANCH}"; then
  BAK="${DEST_BRANCH}-backup-$(date +%Y%m%d-%H%M%S)"
  echo "Creating remote backup: ${BAK}"
  git branch -f "${BAK}" "origin/${DEST_BRANCH}" >/dev/null
  git push -u origin "refs/heads/${BAK}:refs/heads/${BAK}"
fi

# Force-align origin/DEST to SRC
git push --force-with-lease origin "${SRC_BRANCH}:refs/heads/${DEST_BRANCH}"

# Make local DEST match too
if git show-ref --verify --quiet "refs/heads/${DEST_BRANCH}"; then
  git switch "${DEST_BRANCH}"
  git reset --hard "origin/${DEST_BRANCH}"
else
  git switch -c "${DEST_BRANCH}" "origin/${DEST_BRANCH}"
fi

echo "== Pointers =="
echo -n "Local ${SRC_BRANCH}: "; git --no-pager log --oneline -n 1 "${SRC_BRANCH}"
echo -n "origin/${DEST_BRANCH}: "; git --no-pager log --oneline -n 1 "origin/${DEST_BRANCH}"
