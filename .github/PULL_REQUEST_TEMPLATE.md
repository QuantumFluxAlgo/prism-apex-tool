## What changed
- Stabilize jobs boot: static import + single `app.register(jobsBoot)`
- Feed client now uses config-derived env; no `loginUrl` in ClientEnv

## Why
- Remove dangling/dynamic registration that caused TS parse errors
- Align feed client with supported keys; avoid mismatched types

## How to test
1. `pnpm -C apps/api build`
2. `./scripts/smoke-api.sh`
3. Confirm logs **do not** show ENOENT (requires `configs/strategies.default.json`)
4. (Optional) set `JOBS_ENABLE_FEED=true` and verify job startup

## Safety
- No public API changes; `/health`, `/openapi.json` unchanged
- Jobs respect `JOBS_ENABLE_FEED`
