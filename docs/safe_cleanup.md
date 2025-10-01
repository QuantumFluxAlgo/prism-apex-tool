<!-- BEGIN: SAFE_CLEANUP_DOC -->
# Safe Cleanup Script (`safe_cleanup.sh`)


> **TL;DR**
> - Preview (dry-run): `./safe_cleanup.sh`
> - Execute locally (prompted): `DRY_RUN=0 ./safe_cleanup.sh`
> - CI/scripted (no prompt, logged): `AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log`

_Last updated: 2025-10-01_


A **safe-by-default** helper that removes **only untracked files** within a tight allow-list of cache/scratch locations. It runs from the repo root, defaults to **dry-run**, prints a plan, and appends a timestamped summary to `docs/YAHOO_DATA_CLEANUP.md`.

---

## Contents
- [Quick Start](#quick-start)
- [Behavior Matrix](#behavior-matrix)
- [Exit Codes & Return Behavior](#exit-codes--return-behavior)
- [Allow-List & Directory Handling](#allow-list--directory-handling)
- [Logging & Audit Trail](#logging--audit-trail)
- [Usage Patterns & CI](#usage-patterns--ci)
- [Safety Guarantees](#safety-guarantees)
- [Why Untracked-Only?](#why-untracked-only)
- [Operator Checklist](#operator-checklist)
- [Operator Runbook Snippets](#operator-runbook-snippets)
- [Known Pitfalls](#known-pitfalls)
- [Security & PII](#security--pii)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Glossary](#glossary)
- [Tickets-Only Posture Reminder](#tickets-only-posture-reminder)
---
- [Platform Notes & Shell Equivalents](#platform-notes--shell-equivalents)
- [Operator Integration (Makefile / Justfile)](#operator-integration-makefile--justfile)
- [Contributing (Docs/Tooling)](#contributing-docstooling)
- [What Good Looks Like](#what-good-looks-like)
- [Maintenance & Ownership](#maintenance--ownership)
- [Prerequisites & Compatibility](#prerequisites--compatibility)
- [Env Vars Quick Reference](#env-vars-quick-reference)

## Quick Start
Preview (no deletions):
```bash
./safe_cleanup.sh
```

Execute interactively (you will be prompted):
```bash
DRY_RUN=0 ./safe_cleanup.sh
```

Run unattended (CI/script) and capture output:
```bash
AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log
```

---

## Behavior Matrix
| Setting / Mode            | Default | Effect                                                                | Best For                      |
|---------------------------|---------|-----------------------------------------------------------------------|-------------------------------|
| `DRY_RUN=1`               | ✅      | Plan only; prints intended deletions.                                 | First pass / sanity check.    |
| `DRY_RUN=0`               | ❌      | Performs deletions limited to the allow-list.                         | Actual cleanup once vetted.   |
| `AUTO_YES=1`              | ❌      | Skips confirmation prompt (non-interactive environments).             | CI jobs, scripts, cron.       |
| `AUTO_YES=0` with a TTY   | ✅      | Prompts “Proceed with this plan?” before deleting.                    | Local interactive runs.       |
| Logging (always on)       | —       | Appends summary to `docs/YAHOO_DATA_CLEANUP.md` with ISO timestamp.   | Audit trail / operator notes. |

---

## Exit Codes & Return Behavior
| Code | Meaning             | Typical Cause / Action                                              |
|:----:|---------------------|---------------------------------------------------------------------|
| `0`  | Success             | Dry-run or execute completed as planned.                           |
| `1`  | Generic failure     | Not in a git repo, cannot change to repo root, or runtime error.   |
| `2`  | Usage error         | Unsupported flag or invalid invocation; rerun with defaults.       |
| `130`| Operator aborted    | You declined the confirmation prompt during interactive execution. |

> The script uses `set -euo pipefail` to fail fast. CI runners should set `AUTO_YES=1` to avoid hanging on prompts.

---

## Allow-List & Directory Handling
- Allow-listed roots: `backups/`, `data/`, `.cache/`, `cache/`, `caches/`, `tmp/`
- Build caches: `coverage/`, `.nyc_output/`, `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `.turbo/`, `.next/`, `.vercel/`, `build/`
- Uses `git ls-files --others --exclude-standard -z` to consider **untracked-only** entries
- Skips directories that contain tracked files (`git ls-files -- <dir>` check)
- Removes allow-listed directories only if they become empty after cleanup

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
Keep `docs/YAHOO_DATA_CLEANUP.md` in version control to share context across operators.

---

## Usage Patterns & CI
- Post-build tidy: clear `.next/`, `.turbo/`, or other caches between compose runs.
- Merge readiness: ensure scratch artifacts are gone before opening PRs.
- CI housekeeping: scheduled hygiene on ephemeral runners.

### CI Snippet
```yaml
- name: Safe cleanup of untracked caches
  run: AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh
```
> Decide whether to archive or discard the updated `docs/YAHOO_DATA_CLEANUP.md` in CI artifacts.

---

## Safety Guarantees
- Never deletes tracked files.
- Dry-run by default; destructive mode requires `DRY_RUN=0`.
- Confirmation prompt enforced unless `AUTO_YES=1`.
- Bound strictly to the allow-listed locations.

---

## Why Untracked-Only?
Caches, build outputs, and scratch data should be ignored by Git. Limiting deletions to untracked content prevents accidental removal of fixtures, migrations, or other tracked assets.

---

## Operator Checklist
1. Preview: `./safe_cleanup.sh`
2. Execute locally: `DRY_RUN=0 ./safe_cleanup.sh` (confirm when prompted)
3. Execute in CI/script: `AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log`
4. Verify: `git status -sb` (no unintended changes) and skim `docs/YAHOO_DATA_CLEANUP.md`
5. Optional: rerun Docker stack (`docker compose --env-file .env.example.local up -d --build`)
6. Operate: follow the tickets-only posture; copy tickets into Tradovate manually

---

## Operator Runbook Snippets
- **Preview candidates (local):**
  ```bash
  ./safe_cleanup.sh
  ```
- **Interactive execute:**
  ```bash
  DRY_RUN=0 ./safe_cleanup.sh
  ```
- **CI / scripted execute with log:**
  ```bash
  AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log
  ```
- **Verify workspace & tail log:**
  ```bash
  git status -sb
  tail -n 40 docs/YAHOO_DATA_CLEANUP.md
  ```
- **Optional follow-up (stack + tickets-sync logs):**
  ```bash
  docker compose --env-file .env.example.local up -d --build \
    && sleep 8 \
    && docker compose --env-file .env.example.local logs --no-color tickets-sync | tail -n 120
  ```

---

## Known Pitfalls
- **No TTY during interactive run:** Without a TTY, the prompt can’t read input. Use `AUTO_YES=1` for non-interactive contexts.
- **Tracked files inside caches:** Directories containing tracked files are skipped intentionally. Remove or untrack them if you want the script to clean them.
- **Commit hooks noise:** Docs-only commits may print “No staged files match…”. If hooks stall or fail, re-run with `--no-verify` (docs-only).
- **CI log growth:** Repeated CI runs append to `docs/YAHOO_DATA_CLEANUP.md`. Decide whether to keep or reset it between runs.

---

## Security & PII
- Cleanup logs contain only relative file paths within the allow-listed directories; no credentials or PII are captured.
- It is safe to share the log within the team, but review entries before posting externally.
- In CI, either archive the log as an artifact for visibility or prune it if builds are ephemeral.

---

## FAQ
- **Shell lacks `mapfile` — will it fail?** No. The script uses a POSIX-friendly loop.
- **“No candidates” output — is something wrong?** Usually not; the tree may be clean or files are out of scope.
- **Does it delete Docker volumes or containers?** No. Only affects repo files. Use `docker compose down -v` separately if needed.

---

## Troubleshooting
### Docker daemon / `docker.sock` permission error
```
permission denied while trying to connect to the Docker daemon socket ...
```
1. Ensure Docker Desktop/daemon is running.
2. macOS: restart Docker Desktop if sockets become stale.
3. Linux: add user to `docker` group (`sudo usermod -aG docker $USER && newgrp docker`).
4. Remote contexts: `docker context use <context>`.

### Pre-commit hook loops
Docs-only commits may loop noisily. Bypass carefully with:
```bash
git commit -m "docs: update cleanup guide" --no-verify
```
Use `--no-verify` only for documentation-only changes.

---

## Glossary
- **Untracked:** Files not known to Git (`git ls-files --others --exclude-standard`).
- **Allow-list:** Explicit directories where deletions are permitted.
- **TTY:** Interactive terminal required for prompts when `AUTO_YES=0`.
- **CI:** Continuous Integration; non-interactive runners should set `AUTO_YES=1`.

---

## Tickets-Only Posture Reminder
Local maintenance only — no order placement and no strategy changes. Continue the operator flow: tidy → run Docker stack → manually copy tickets into Tradovate OCO orders.

### Platform Notes & Shell Equivalents
**macOS/Linux (POSIX shells like bash/zsh):**
```bash
./safe_cleanup.sh                # dry-run (default)
DRY_RUN=0 ./safe_cleanup.sh      # execute with prompt
AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log
```

**Windows PowerShell:**
```powershell
# Dry-run
./safe_cleanup.sh

# Execute with auto-yes and capture log
$env:AUTO_YES = "1"
$env:DRY_RUN  = "0"
./safe_cleanup.sh | Tee-Object -FilePath cleanup_real.log

# Optional cleanup
Remove-Item Env:AUTO_YES, Env:DRY_RUN -ErrorAction SilentlyContinue
```

**Windows Subsystem for Linux (WSL):**
Use the POSIX examples inside WSL. If the repo lives on the Windows filesystem, prefer a WSL path (e.g., `/home/...`) to avoid permission quirks.

---

## Operator Integration (Makefile / Justfile)
**Makefile**
```make
.PHONY: clean:safe
clean:safe:
	@AUTO_YES?=0 DRY_RUN?=1 bash -lc './safe_cleanup.sh'
# Examples:
#   make clean:safe                         # dry-run
#   make clean:safe DRY_RUN=0               # execute with prompt
#   make clean:safe DRY_RUN=0 AUTO_YES=1    # execute no prompt
```

**Justfile**
```just
# just clean-safe
clean-safe:
    AUTO_YES={{AUTO_YES | default("0")}} DRY_RUN={{DRY_RUN | default("1")}} ./safe_cleanup.sh
# Examples:
#   just clean-safe
#   just clean-safe DRY_RUN=0
#   just clean-safe AUTO_YES=1 DRY_RUN=0
```

---

## Contributing (Docs/Tooling)
- Keep PRs focused and small; scope to docs/tooling improvements.
- Never add automated order placement, liquidation logic, or other trading automation in this path.
- Target the `Test` branch (never main) and note operator impact in the PR description.

### What Good Looks Like

**Dry-run (expected):**
```text
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Git root: /…/prism-apex-tool-Test
Dry run: 1

-- Files to delete (untracked, in allow-listed dirs): 0
  (none)

-- Directories to delete recursively (build caches): 2
  - .next
  - .turbo
(auto-continue: dry-run or AUTO_YES set or non-interactive)
[DRY-RUN] No deletions performed.
```

**Execute with AUTO_YES (expected when there are candidates):**
```text
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Git root: /…/prism-apex-tool-Test
Dry run: 0

-- Files to delete (untracked, in allow-listed dirs): 3
  - tmp/sim.log
  - data/snap/cache.bin
  - .cache/test.idx

-- Directories to delete recursively (build caches): 1
  - .turbo

removed dir .turbo
deleted tmp/sim.log
deleted data/snap/cache.bin
deleted .cache/test.idx
rmdir tmp (empty)
Done.
```

> If the output lists tracked files or non-allow-listed paths, **stop and investigate** before proceeding.

### Maintenance & Ownership
- **Owners**: Tooling/Docs maintainers (this path is docs/tooling-only).
- **Scope**: Do **not** introduce order placement, liquidation logic, or strategy changes here.
- **How to contribute**: Open a small PR to `Test` with operator impact noted; keep edits scoped to docs/tooling.
- **Operating posture**: Tickets-only remains in force—operators still copy tickets into Tradovate OCO manually.

### Prerequisites & Compatibility
- **Git** installed with the repository cloned locally (script runs from repo root).
- **Shell**: POSIX-compatible (bash/zsh); supported on **macOS**, **Linux**, and **WSL**. PowerShell users can use `$env:` syntax from the Platform Notes section.
- **Docker** (optional): required only if you run the follow-up compose smoke checks; the cleanup itself has no Docker dependency.

### Env Vars Quick Reference
| Variable | Default | When to override | Effect |
|----------|:-------:|------------------|--------|
| `DRY_RUN` | `1` | Set `DRY_RUN=0` to perform deletions. | Toggle between preview and actual cleanup. |
| `AUTO_YES` | `0` | Set `AUTO_YES=1` for non-interactive runs (CI/scripts). | Skips the confirmation prompt when `DRY_RUN=0`. |

[↩︎ Back to top](#safe-cleanup-script-safe_cleanupsh)
<!-- END: SAFE_CLEANUP_DOC -->


