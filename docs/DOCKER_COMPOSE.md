Prism Apex — Docker Compose (source of truth)

This repository intentionally enforces one local deployment topology.

Canonical local contract

Compose file: docker-compose.v2.local.yml

Deploy entrypoint: ./tools/codex/deploy_local.sh

Single published port: 5180:80 (ingress only)

DB schema always correct: migrate runs deploy/sql/*.sql on every boot before API/jobs start

Jobs always-on: tickets-cron, gapfill-cron, ingress-yahoo, jobs-seed, shadow-outcomes-cron

Manual-only job: gapfill-once (behind the manual profile)

Run (recommended)
./tools/codex/deploy_local.sh

Proof commands
docker compose -f docker-compose.v2.local.yml config >/tmp/prismapex_v2_local.render.yml
bash tools/codex/guard_ports_local.sh
curl -fsS http://127.0.0.1:5180/ui-meta
curl -fsS http://127.0.0.1:5180/health
docker compose -f docker-compose.v2.local.yml ps

Manual-only: gapfill-once
docker compose -f docker-compose.v2.local.yml --profile manual run --rm gapfill-once

Legacy compose quarantine

All non-canonical manifests are quarantined in ops/legacy-compose/ (often renamed *.DISABLED).
They exist for archaeology only and must not be used for local runs.
