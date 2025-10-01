<!-- BEGIN: SAFE_CLEANUP_DOC -->
# Safe Cleanup Script (`safe_cleanup.sh`)

## Overview
- **Scope:** removes only Git-untracked files and directories beneath a curated allow-list of cache/scratch locations.
- **Defaults:** runs from the repo root, starts in `DRY_RUN=1` preview mode, and prompts before destructive actions.
- **Traceability:** appends a timestamped summary to `docs/YAHOO_DATA_CLEANUP.md` on every invocation.

---

## Quick Start
- Preview (no deletions):
  ```bash
  ./safe_cleanup.sh
  ```
- Execute interactively (prompts for confirmation):
  ```bash
  DRY_RUN=0 ./safe_cleanup.sh
  ```
- Non-interactive / CI-friendly run with log capture:
  ```bash
  AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log
  ```

---

## Behavior Matrix
| Setting / Mode                    | Default | Effect                                                                 | Best For                          |
|----------------------------------|---------|------------------------------------------------------------------------|-----------------------------------|
| `DRY_RUN=1`                      | ✅      | Plans deletions only; nothing removed.                                 | First pass / sanity check.        |
| `DRY_RUN=0`                      | ❌      | Performs deletions limited to the allow-list.                          | Real cleanup once vetted.         |
| `AUTO_YES=1`                     | ❌      | Skips interactive confirmation prompts.                                | CI jobs, scripts, cron.           |
| `AUTO_YES=0` (with TTY)          | ✅      | Prompts “Proceed with this plan?” before deleting.                      | Manual use on local terminals.    |
| Logging (always on)              | —       | Appends summary to `docs/YAHOO_DATA_CLEANUP.md` with ISO timestamp.     | Audit trail / operator notes.     |

---

## Allow-List & Directory Handling
- Allow-listed roots: `backups/`, `data/`, `.cache/`, `cache/`, `caches/`, `tmp/`.
- Build caches: `coverage/`, `.nyc_output/`, `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `.turbo/`, `.next/`, `.vercel/`, `build/`.
- Uses `git ls-files --others --exclude-standard -z` to consider **untracked-only** entries.
- Skips any candidate directory containing tracked files (`git ls-files -- <dir>` check).
- Removes allow-listed directories only if they become empty after cleanup (optional hygiene).

---

## Logging & Audit Trail
Each run appends a section similar to:
```
## 2025-02-10T21:34:11-05:00
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Git root: /path/to/repo
Dry run: 0
-- Files to delete (untracked, in allow-listed dirs): 3
  - tmp/foo.log
```
Keep `docs/YAHOO_DATA_CLEANUP.md` versioned to share context across operators.

---

## Usage Patterns & Examples
- **Post-build tidy:** clear `.next/`, `.turbo/`, or other build caches between Docker compose runs.
- **Merge readiness:** ensure scratch artifacts are gone before opening PRs.
- **CI housekeeping:** run in scheduled jobs to keep ephemeral runners clean.

### CI Snippet
```yaml
- name: Safe cleanup of untracked caches
  run: AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh
```
> Decide whether to archive or discard the updated `docs/YAHOO_DATA_CLEANUP.md` in CI artifacts.

---

## Safety Guarantees
- Never deletes tracked files (untracked-only enumeration).
- Dry-run by default; destructive mode requires `DRY_RUN=0`.
- Confirmation prompt enforced unless `AUTO_YES=1` explicitly opts out.
- Bound strictly to the allow-listed locations; no project-wide `rm -rf`.

---

## Why Untracked-Only?
Caches, build outputs, and scratch data should be ignored by Git. Limiting deletions to untracked content prevents accidental removal of fixtures, migrations, or other tracked assets that intentionally live in the repository.

---

## FAQ
- **Shell lacks `mapfile` — will it break?** No. The script uses a POSIX-compatible loop over null-delimited `git ls-files` output.
- **“No candidates” output — is something wrong?** Usually not. The tree may already be clean or files live outside the allow-list; remove those manually if needed.
- **Does it touch Docker volumes or containers?** No. It only operates on the repository filesystem. Use `docker compose down -v` if you need to prune volumes.

---

## Troubleshooting
### Docker daemon / `docker.sock` permission error
If you encounter `permission denied while trying to connect to the Docker daemon socket`:
1. Ensure Docker Desktop/daemon is running.
2. macOS: restart Docker Desktop if sockets become stale.
3. Linux: confirm membership in the `docker` group (`sudo usermod -aG docker $USER && newgrp docker`).
4. Remote contexts: `docker context use <context>` before running commands that expect a local daemon.

### Pre-commit hook noise (“No staged files match any configured task”)
Some hooks emit this repeatedly on docs-only commits. If a commit fails or loops, retry with:
```bash
git commit -m "docs: update cleanup guide" --no-verify
```
Use `--no-verify` only for documentation-only changes.

---

## Tickets-Only Posture Reminder
This script is local maintenance hygiene. It does **not** place orders or alter trading logic. Continue the standard operator flow: tidy workspace → run Docker stack → manually copy tickets into Tradovate OCO orders.
<!-- END: SAFE_CLEANUP_DOC -->
