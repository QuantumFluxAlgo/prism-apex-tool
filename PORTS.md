# Canonical Ports (Local & Compose)

## Contract (non-negotiable)

**Local operator/browser entrypoint is ONLY:**
- http://localhost:5180

Everything else is **container-internal only**. No other host ports may be published.

This is enforced by:
- `bash tools/codex/guard_ports_local.sh` (blocks drift)
- `.githooks/pre-commit` and `.github/workflows/guard-ports.yml` (if present in your repo)

## Ports (what exists vs what is exposed)

| Surface | Port | Exposed on host? | Notes |
|---|---:|:---:|---|
| Ingress (Nginx) | 80 (container) | ✅ **5180 → 80** | Single entrypoint. Routes `/` to dashboard and `/api/*` to API. |
| Dashboard (`dashboard-full`) | 80 (container) | ❌ | Served ONLY through ingress. |
| API (`api`) | 3000 (container) | ❌ | Served ONLY through ingress at `/api/*`. |
| Postgres (`db`/`postgres`) | 5432 (container) | ❌ | No host mapping. DB is internal-only in local stack. |

## Quick checks

- Render compose: `docker compose -f docker-compose.v2.local.yml config >/dev/null`
- Guard: `bash tools/codex/guard_ports_local.sh`
- Smoke: `curl -fsS http://localhost:5180/ui-meta >/dev/null`
