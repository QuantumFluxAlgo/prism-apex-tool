# Follow-up Questions (Please answer in chat)

1. There are 1 notebook(s). Should we archive all notebooks to `archive/` or keep a curated subset?
2. Found 5 log file(s)/folders. OK to remove logs entirely (they are reproducible) or keep last N by date?
3. Found 6 environment file(s). Confirm which `.env*` can be ignored vs. need to keep examples only?
4. Detected build artifacts. OK to treat `/dist` and `/build` as generated and exclude from git?
5. Strategy-related configs detected. Which directories or files are canonical versus experimental?
6. Confirm that `tickets/*.jsonl` are sacred: archive never delete.
7. Confirm there must be **no API order placement** in code or docs; review heuristics before any future removals.
8. Confirm which strategy configs are the source of truth versus sample or legacy variants.

