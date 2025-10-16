# Post-merge Verification
- UTC: 2025-09-29 21:07:36
- Base: Test
- Branch: chore/post-merge-verification

## Git
```
## chore/post-merge-verification...origin/Test
 M docs/YAHOO_DATA_CLEANUP.md
?? docs/POST_MERGE_VERIFY.md
```

## Cleanup (dry-run)
Ran `DRY_RUN=1 tools/cleanup_yahoo_data.sh` (no deletions). See `docs/YAHOO_DATA_CLEANUP.md` for tracked candidates.

## Docker smoke
- `docker compose --env-file .env.example.local up -d --build`
- API health reached `healthy`
- `docker compose --env-file .env.example.local logs --no-color tickets-sync | tail -n 80`
- `tail -n 10 data/tickets.jsonl`
- `docker compose --env-file .env.example.local down`
