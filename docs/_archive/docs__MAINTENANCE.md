# Maintenance — SAFE Data Cleanup

Use `tools/cleanup_yahoo_data.sh` to clear Yahoo-style artifacts in a controlled way.

1. **Dry run (recommended first)**
   ```bash
   tools/cleanup_yahoo_data.sh --dry-run
   ```
   Only reports what *would* be backed up/removed (writes to `docs/YAHOO_DATA_CLEANUP.md`).

2. **Real cleanup**
   ```bash
   tools/cleanup_yahoo_data.sh
   ```
   Creates a timestamped `backups/yahoo-data-*.tar.gz` archive before deleting untracked candidates.

Tracked files are never deleted; tracked candidates are listed for manual inspection.
