# Docker Compose (Canonical)

## Canonical local stack

**File:** `docker-compose.v2.local.yml`

**Purpose:** prod-like local stack behind a single ingress.

**Contract:**
- Only host port allowed: **5180**
- UI and API are consumed via **http://localhost:5180**
- `/` → dashboard (`dashboard-full`)
- `/api/*` → API (`api`)

## Canonical commands

- Render: `docker compose -f docker-compose.v2.local.yml config`
- Boot: `docker compose -f docker-compose.v2.local.yml up -d --build --force-recreate --remove-orphans`
- Stop: `docker compose -f docker-compose.v2.local.yml down --remove-orphans`
- Guard: `bash tools/codex/guard_ports_local.sh`

If present, prefer wrappers:
- `bash tools/codex/dc_local.sh ps`
- `bash tools/codex/stabilize_5180.sh all`

## Jobs (optional profile)

If the local compose includes background services under a `jobs` profile, run them explicitly:

- `docker compose -f docker-compose.v2.local.yml --profile jobs up -d`

## Non-canonical compose files

Any other compose variants are **not part of the supported local path** unless explicitly referenced by this document.

If your repo contains an `ops/legacy-compose/` quarantine, treat those files as reference-only.
