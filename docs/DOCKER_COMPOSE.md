## Docker Operations (Canonical)

This repository uses **profile-driven Docker Compose**. The base `docker-compose.yml` is a **library file only** and must **never** be run directly.

To ensure deterministic, repeatable deployments, **always use the provided Codex scripts** below.

---

### Local Development (Mac / localhost)

### Local dev: jobs always-on + DB migrations automatic


### Manual-only: gapfill-once
- `gapfill-once` is **manual** (not always-on). It is included behind the `manual` profile to prevent accidental replays.
- Run it explicitly when you want a one-off backfill:
  - `docker compose -f docker-compose.v2.local.yml --profile manual run --rm gapfill-once`
**Single entrypoint:** the only supported browser URL is **http://localhost:5180** (ingress).  
**Canonical compose:** `docker-compose.v2.local.yml` only.

What runs on every local deploy:

- Core: `db` → `migrate` → `api` + `dashboard-full` + `ingress`
- Jobs (always-on): `tickets-cron`, `gapfill-cron`, `ingress-yahoo`, `jobs-seed`

Hard guarantees:

- **Only** ingress publishes a host port (**5180:80**). API, DB, dashboard, and jobs remain internal.
- `migrate` applies `deploy/sql/*.sql` in order on startup.
- API and job services are gated on **db healthy** + **migrate completed successfully**.

Operational commands:

```bash
# Canonical start/rebuild (includes jobs + migrate)
docker compose -f docker-compose.v2.local.yml up -d --build --force-recreate --remove-orphans

# Guard contract (must stay green)
bash tools/codex/guard_ports_local.sh

# Health proofs (through ingress only)
curl -fsS http://127.0.0.1:5180/ui-meta
curl -fsS http://127.0.0.1:5180/health
```

Notes:

gapfill-once is manual-only (run explicitly) unless we decide otherwise, because it can reprocess historical data.

**Purpose**

* Run the full Prism Apex V2 stack locally
* Dashboard available on `http://localhost:8080`

**Command**

```
./codex/docker-local-up.sh
```

**Compose file used**

* `docker-compose.yml` (all services) – script rebuilds containers, applies the core schema (`apps/api/db/schema_v2.sql`), applies all SQL migrations under `deploy/sql`, and runs the ingest/tickets backfills (`YAHOO_RANGE=1d`) so the DB has fresh bars before you start testing.

---

### Server Deployment (Ubuntu / production-like)

**Purpose**

* Run the Prism Apex V2 stack on a server
* Same service topology as local, without dev assumptions

**Prep**

* Copy `codex/.env.server.example` to `codex/.env.server` and fill in secrets (`POSTGRES_PASSWORD`, `PUBLIC_API_BASE`, etc.)

**Command**

```
./codex/docker-server-up.sh
```

**Compose file used**

* `docker-compose.yml` with `codex/.env.server` (all services + secrets) – script rebuilds containers, applies the core schema plus all SQL migrations, and runs ingest/gapfill/tickets backfills with `YAHOO_RANGE=7d` on boot for deeper history.

---

### Important Rules (Do Not Violate)

* ❌ Do **not** run `docker compose up` without `-f`

* ❌ Do **not** run `docker-compose.yml` directly

* ❌ Do **not** edit compose files to "make Docker work"

* ✅ Use the Codex scripts only

* ✅ Treat compose files as immutable infrastructure definitions

---

### Expected Ports

* Dashboard: `5180` (served by `dashboard-full`, proxying API requests)
* Ingress (if enabled): `8080`
* API: as defined in V2 compose files

---

### Database Setup

Run `./codex/db-init.sh` after the stack is healthy (local or server) to ensure the risk/session tables exist. The script pipes `apps/api/db/schema_v2.sql` into the Postgres container (`prismapex-postgres` by default) and respects `POSTGRES_USER` / `POSTGRES_DB` if set.

Both scripts automatically remove orphaned containers and start every service (API, dashboard, ingress, cron jobs, ticketizer, etc.), mirroring the production topology by default.

---

This setup is intentional and prevents:

* `no service selected` errors
* profile misconfiguration
* accidental partial deployments

If Docker does not start, verify:

* You are using the correct script
* Docker is running
* The repo root is the current working directory



## Canonical local 5180 ingress

Local development uses one entrypoint: http://localhost:5180. UI, API, and metadata all run through that same host port (dashboard-full + ingress) and guard_ports_local.sh enforces it. Avoid any guidance that points people to 3000/8080/8090/55433 or manual reverse proxies.
