# Prism Apex — Local Dev (canonical)

This project runs **tickets-only** locally (no broker execution). The goal is deterministic, production-like orchestration:

**Yahoo ingress → Postgres → strategy jobs → tickets → API/Dashboard**

## Canonical contract

- **Single entrypoint (browser + API):** http://localhost:5180
- **Single compose file (source of truth):** `docker-compose.v2.local.yml`
- **Migrations are automatic:** `migrate` runs `deploy/sql/*.sql` on every deploy
- **Jobs are always-on:** `tickets-cron`, `gapfill-cron`, `ingress-yahoo`, `jobs-seed`, `shadow-outcomes-cron`
- **Port policy:** only `ingress` publishes a host port (**5180:80**). API/DB/jobs are internal-only.

## One-command local deploy (recommended)

```bash
./tools/codex/deploy_local.sh

Manual alternative (raw compose)
docker compose -f docker-compose.v2.local.yml up -d --build --force-recreate --remove-orphans

Verify (must be green)
bash tools/codex/guard_ports_local.sh
curl -fsS http://127.0.0.1:5180/ui-meta
curl -fsS http://127.0.0.1:5180/health
docker compose -f docker-compose.v2.local.yml ps

Manual-only: gapfill-once

gapfill-once is intentionally manual (behind the manual profile) to prevent accidental historical replays.

docker compose -f docker-compose.v2.local.yml --profile manual run --rm gapfill-once

Quarantine policy (avoid drift)

Legacy compose manifests are quarantined under ops/legacy-compose/ and must not be used for local deploys.

If any doc/script references anything except docker-compose.v2.local.yml + ./tools/codex/deploy_local.sh, treat it as stale.
