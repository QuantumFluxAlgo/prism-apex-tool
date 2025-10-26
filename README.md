# Prism-Apex Tool

## Deployment (Local & Server)

### Canonical Ports
- API (DB mode): **3000**
- API (mock mode): **8000**
- Dashboard dev (Vite): **5173**
- Dashboard prod (compose): **5180**
- Postgres (host-mapped): **55433**

See [PORTS.md](./PORTS.md) for the canonical matrix and guardrail.

### Local Mock Stack (fast dev loop)
```bash
bash scripts/local-up.sh     # API :8000 + dashboard :5173
bash scripts/local-smoke.sh  # health/tickets/CSV (mock mode)
bash scripts/local-down.sh   # stop everything
```

### Local DB Mode (compose db + API, dev dashboard)
```bash
docker compose up -d db   # maps db:5432 -> host:55433
DATABASE_URL=postgresql://apex:apex@db:5432/prismapex docker compose up -d api
# curl -fsS http://localhost:3000/health   (use 127.0.0.1:3000 for JSON)
API_URL=http://localhost:3000 bash scripts/dev-web-8000.sh
# Open http://localhost:5173
```

### Server / Production-ish from a Tag
```bash
git fetch --all --tags
git checkout v1.0.0
TAG=v1.0.0 bash scripts/server-up.sh
# API: http://<server>:3000   Web: http://<server>:5180   DB: <server>:55433
```

All flows reuse existing scripts/compose services; no new workflows were introduced.
