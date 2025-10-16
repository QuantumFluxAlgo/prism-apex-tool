# Cleanup Report

- Timestamp: 2025-10-04T14:56:41+01:00
- Mode: DELETE
- Large file threshold: 50MB

## Removed Paths
- (logs) `logs/final-check.txt` (tracked)
- (reports logs) `reports/removals/round1/20250909-133034/removals.log`
- (workspace logs) `cleanup_real.log` (untracked)
- (workspace logs) `cleanup_dryrun.log` (untracked)
- Additional untracked cache/log directories discovered via `docs/scan/*.json` (dist/build/tmp/dump variants) — all removed.

## Disk Usage
- Before: 481.69 MB (505088169 bytes)
- After : 481.69 MB (505087524 bytes)
- Saved : 645.00 B (645 bytes)

## Notes
- tickets/*.jsonl, source trees, configs, migrations, and `.env*` were left untouched.
- Set `CLEANUP_DRY_RUN=1` to preview or `ARCHIVE_MODE=1` to move clutter into `archive/ATTIC-<date>` instead of deleting.
- No automated order placement or liquidation paths were introduced.
