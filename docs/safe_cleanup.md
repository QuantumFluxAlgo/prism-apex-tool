# Safe Cleanup Script (`safe_cleanup.sh`)

`safe_cleanup.sh` is a **safe-by-default** helper that scrubs untracked cache and scratch files from the repo without touching tracked sources. It always runs from the Git root, defaults to a dry run, prints a plan, and appends a timestamped summary to `docs/YAHOO_DATA_CLEANUP.md` for traceability.

---

## Quick Start

Preview what would be deleted (recommended first pass):

```bash
./safe_cleanup.sh
```

Perform deletions interactively (you will be prompted to confirm):

```bash
DRY_RUN=0 ./safe_cleanup.sh
```

Run unattended (e.g., scripted/CI) and capture the log:

```bash
AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log
```

---

## Behavior Matrix

| Setting / Mode                     | Default | Effect                                                                 | Typical Use                          |
| ---------------------------------- | ------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `DRY_RUN=1`                        | ✅      | Prints the planned deletions; no files removed.                        | First look before deleting anything. |
| `DRY_RUN=0`                        | ❌      | Performs deletions according to the allow-list.                        | Actual cleanup once plan is vetted.  |
| `AUTO_YES=1`                       | ❌      | Skips confirmation prompt (non-interactive environments).             | CI, scripts, or cron jobs.           |
| Interactive prompt (`AUTO_YES=0`)  | ✅      | Asks "Proceed with this plan?" before deleting (only when `DRY_RUN=0`). | Manual, one-off cleanups.            |
| Logging (always on)                | —       | Appends summary to `docs/YAHOO_DATA_CLEANUP.md` with ISO timestamp.    | Run history / audit trail.           |

---

## Allow-List & Directory Handling

Only untracked paths beneath the locations below are considered for deletion:

- `backups/`
- `data/`
- `.cache/`, `cache/`, `caches/`
- `tmp/`
- Build caches: `coverage/`, `.nyc_output/`, `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `.turbo/`, `.next/`, `.vercel/`, `build/`

Additional guards:

- **Untracked-only** – the script uses `git ls-files --others --exclude-standard -z`, so tracked files are ignored.
- **Tracked-content skip** – if any tracked file exists inside a candidate cache directory, that directory is skipped.
- **Empty-directory cleanup** – allow-listed directories are removed if they become empty after deletions.

---

## Logging & Audit Trail

Each run appends a section similar to the following to `docs/YAHOO_DATA_CLEANUP.md`:

```
## 2025-02-10T21:34:11-05:00
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Git root: /path/to/repo
Dry run: 0
-- Files to delete ...
```

Keep this file in version control so the team retains an audit trail of cleanups.

---

## Usage Patterns & Examples

- **Dry run before merge** – sanity-check that you will not delete anything unexpected.
- **Post-Docker build cleanup** – clear `.next/`, `.turbo/`, or other build artifacts between compose runs.
- **CI hygiene** – include in housekeeping steps to ensure ephemeral runners stay tidy.

### CI Snippet

```yaml
- name: Safe cleanup of untracked caches
  run: AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh
```

> Logs from CI will still be appended to `docs/YAHOO_DATA_CLEANUP.md`; decide whether to keep or discard that file between jobs.

---

## Safety Guarantees

- **Never deletes tracked files.** Git-managed content is untouched.
- **Dry-run by default.** You must opt in (`DRY_RUN=0`) to perform deletions.
- **Allow-list boundary.** Only the cache/scratch directories above are affected.
- **Confirmation prompt.** When running interactively with `DRY_RUN=0`, you must confirm unless `AUTO_YES=1`.
- **Single pass.** No recursive `rm -rf /` style operations outside the allow-list.

---

## Why Untracked-Only?

Build outputs, caches, and scratch data should be ignored by Git. Limiting deletions to untracked content prevents accidental removal of checked-in fixtures, migrations, or other assets that intentionally live in the repository.

---

## FAQ

**Q: My shell doesn’t support `mapfile`. Will the script fail?**  
No. The implementation uses a POSIX-compatible loop over the null-delimited output of `git ls-files`.

**Q: The script reports “No candidates.” Is something wrong?**  
No. Either the workspace is already clean or files live outside the allow-list. Remove those manually or adjust tooling to write into the approved directories.

**Q: Does this touch Docker volumes or containers?**  
No. It only affects files inside the repo on disk. Use `docker compose down -v` separately if you need to prune volumes.

---

## Troubleshooting

### Docker daemon / `docker.sock` permission errors

If you encounter:

```
permission denied while trying to connect to the Docker daemon socket ...
```

- Ensure Docker Desktop (macOS/Windows) or the Docker daemon (Linux) is running.
- On macOS, restarting Docker Desktop usually restores socket permissions.
- On Linux, confirm your user is in the `docker` group (`sudo usermod -aG docker $USER && newgrp docker`).
- For remote contexts, call `docker context use <context>` before running cleanup scripts that interact with Docker.

### Pre-commit hook noise: “No staged files match any configured task”

Some hooks print this message repeatedly on docs-only commits but otherwise succeed. If a commit stalls or fails because of hooks, re-run with:

```bash
git commit -m "docs: update cleanup guide" --no-verify
```

> Use `--no-verify` only for documentation-only changes.

### Nothing happens when `DRY_RUN=0`

If the real run still reports zero candidates, confirm that the files are untracked and inside the allow-list. Tracked or out-of-scope paths are intentionally skipped.

---

## Tickets-Only Posture Reminder

This script is local-maintenance hygiene. It does **not** place orders or change strategy logic. After tidying the workspace, continue the standard operator flow: run the Docker stack, review tickets, and manually enter OCO orders in Tradovate.
