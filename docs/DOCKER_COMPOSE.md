## Docker Operations (Canonical)

This repository uses **profile-driven Docker Compose**. The base `docker-compose.yml` is a **library file only** and must **never** be run directly.

To ensure deterministic, repeatable deployments, **always use the provided Codex scripts** below.

---

### Local Development (Mac / localhost)

**Purpose**

* Run the full Prism Apex V2 stack locally
* Dashboard available on `http://localhost:8080`

**Command**

```
./codex/docker-local-up.sh
```

**Compose file used**

* `docker-compose.v2.local.yml`

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

* `docker-compose.v2.server.yml`

---

### Important Rules (Do Not Violate)

* ❌ Do **not** run `docker compose up` without `-f`

* ❌ Do **not** run `docker-compose.yml` directly

* ❌ Do **not** edit compose files to "make Docker work"

* ✅ Use the Codex scripts only

* ✅ Treat compose files as immutable infrastructure definitions

---

### Expected Ports

* Dashboard: `8080`
* Ingress (if enabled): `8180`
* API: as defined in V2 compose files

---

This setup is intentional and prevents:

* `no service selected` errors
* profile misconfiguration
* accidental partial deployments

If Docker does not start, verify:

* You are using the correct script
* Docker is running
* The repo root is the current working directory
