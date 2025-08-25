# Upgrade Guide

## From older snapshots to v0.1.0

1. **Engines & Package Manager**

- Use Node **20.x** and pnpm **9.x**.
- `corepack enable && pnpm -v` should show 9.x.

2. **Install**

```bash
pnpm install
```

3. **Environment**

Copy `.env.example` → `.env`.

Optional auth

```bash
export BEARER_TOKEN="change-me"
```

Optional rate-limit tuning

```bash
export RATE_LIMIT_MAX=60
export RATE_LIMIT_WINDOW_MS=60000
export RATE_LIMIT_MAX_BUCKETS=50000
```

4. **Run locally**

```bash
pnpm --filter ./apps/api dev
# or Docker:
pnpm compose:up
```

5. **Validate**

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/openapi.json
```

6. **Tests / Typecheck**

```bash
pnpm test          # per-workspace
pnpm typecheck     # source-only typecheck
pnpm coverage      # API package coverage
```

7. **Docker production image**

```bash
pnpm docker:build
pnpm docker:run
```

## Notes

- ESM only. Legacy CJS configs should be removed or converted.
- Public routes: `/health`, `/ready`, `/openapi.json`, `/version`.
