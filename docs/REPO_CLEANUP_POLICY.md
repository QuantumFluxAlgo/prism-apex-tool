# Repository Cleanup Policy — Delete-First

Prism-Apex repositories only automate the **brain**: we generate signals, guardrails, and tickets so an operator can execute manually. Nothing here places orders or liquidates accounts via API. Our cleanup policy follows the same philosophy—keep source of truth files safe while aggressively removing clutter that is reproducible.

## Guardrails (never delete)
- Application and library code: `apps/**`, `packages/**`, `src/**`, `services/**`
- Strategy and runtime configuration: `configs/**`, `config/**`
- Database and schema changes: `migrations/**`
- Ticket history: `tickets/*.jsonl` (**sacred**) — archive, never delete.
- Environment templates and examples: any `.env*`

These paths may only be moved or deleted with an explicit approval outside of the automated cleanup.

## Delete-first categories (safe to drop)
- Caches: `__pycache__/`, `.ipynb_checkpoints/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`
- Logs: every `*.log` file and any `logs/**` directory
- Build output: `dist/**`, `build/**`, `.tmp/`
- Temp/dumps: `tmp/**`, `temp/**`, `dump/**`, `dumps/**`
- Databases & pids generated locally: `*.sqlite`, `*.db`, `*.pid`
- Known compiled output: `apps/api/dist-cjs/`
- Oversized loose assets outside the protected trees (default `>50MB`)

These artifacts are reproducible from source. When the cleanup script finds them under Git control, it stages a deletion; if they are untracked it removes them outright.

## Cleanup script (`scripts/cleanup_repo.sh`)
- Default mode is **delete-first**.
- Reads scan inventories in `docs/scan/*.json` (logs, caches, builds, dumps, notebooks, large files) when available, then falls back to pattern matching.
- Preserves the guardrail paths listed above and anything beginning with `.env`.
- Writes a manifest to `docs/CLEANUP_REPORT.md` including disk usage before/after.
- Supports `CLEANUP_DRY_RUN=1` for preview and `ARCHIVE_MODE=1` to move clutter into `archive/ATTIC-YYYYmmdd/` instead of deleting.

## Rollback & safety
- Deleted tracked files remain in Git history—use `git checkout -- <path>` or `git revert` if a classification was wrong.
- Untracked deletions are permanent. Run with `CLEANUP_DRY_RUN=1` first if unsure.
- No command in this policy or its scripts introduces automated order placement or emergency liquidation. The operator workflow (tickets → Tradovate OCO) remains intact.
