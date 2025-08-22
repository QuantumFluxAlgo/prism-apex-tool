# Prism Apex Tool — Deployment (Production)

## Overview
This stack deploys two containers:
- **API** on port **8000**
- **Dashboard** on port **80** (proxies `/api/*` to API via Nginx in the image)

## One-time Server Setup
1. Provision Ubuntu 22.04 server.
2. Add GitHub Actions secrets (below).
3. First CI run will **bootstrap** Docker automatically.

## Required GitHub Secrets
- `GHCR_USERNAME`, `GHCR_TOKEN` — push images to GHCR  
- `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY` — deploy over SSH  
- `PROD_STACK_DIR` — e.g., `/home/ubuntu/prism-stack`  
- `STACK_NAME` — e.g., `prism`  

## First Deploy
1. Copy `infra/.env.prod.example` → create **server** file `${PROD_STACK_DIR}/.env`.
2. Tag a release locally:
   ```bash
   make release TAG=v0.1.0
   ```
3. CI builds & pushes images, then deploys to the server.

## Verify:
- <http://<server-ip>/> (dashboard)
- <http://<server-ip>:8000/health> (API)

## Rollback
Re-deploy previous tag:

```
TAG=v0.0.9 make deploy
```

## Notes
- Volumes are preserved across updates (prism_data).
- Health-gated rollout avoids serving broken builds.
- Add a reverse proxy + TLS later (Caddy/Traefik) if you need HTTPS.
