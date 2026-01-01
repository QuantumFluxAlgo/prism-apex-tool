# Local Development (Canonical)

## Golden path (5180-only, prod-like)

The canonical local workflow is **Docker Compose + ingress** with a **single entrypoint**:

- **UI + API:** http://localhost:5180

No other host ports should be published.

### Start

Preferred (if present):
- `bash tools/codex/stabilize_5180.sh all`

If you run compose directly:
- `docker compose -f docker-compose.v2.local.yml up -d --build --force-recreate --remove-orphans`

### Verify

- `bash tools/codex/guard_ports_local.sh`
- `curl -fsS http://localhost:5180/ui-meta | head`
- `curl -fsS http://localhost:5180/ | head`
- `curl -fsS http://localhost:5180/api/health | head || true`
- `curl -fsS http://localhost:5180/api/worklist | head || true`

If present:
- `bash tools/codex/stabilize_5180.sh verify`

### Stop / reset

- `docker compose -f docker-compose.v2.local.yml down --remove-orphans`

## Jobs profile (optional)

If your `docker-compose.v2.local.yml` includes job-ish services under a `jobs` profile, bring them up explicitly:

- `docker compose -f docker-compose.v2.local.yml --profile jobs up -d`

Or if the wrapper exists:
- `bash tools/codex/dc_local.sh --profile jobs up -d`

## Troubleshooting (fast)

1) Confirm ingress is listening:
- `lsof -nP -iTCP:5180 -sTCP:LISTEN || true`

2) Confirm ingress routes:
- `curl -i http://localhost:5180/ui-meta | sed -n '1,40p'`

3) Check container status:
- `docker compose -f docker-compose.v2.local.yml ps`
- `docker compose -f docker-compose.v2.local.yml logs --tail=200 ingress`
