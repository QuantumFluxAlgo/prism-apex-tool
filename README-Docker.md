# Docker & Compose (Prod-like)

## Prereqs
- Docker Desktop or Docker Engine
- (Optional) copy `.env.docker.example` to `.env` and fill in values

## One command up
```bash
docker compose up --build
```

Dashboard: http://localhost:3000

API: http://localhost:8000/health

Data persistence:

API writes to /var/lib/prism-apex-tool inside the container

Mounted to ./data on your host

Common tasks

Rebuild after code changes:

```bash
docker compose build --no-cache
docker compose up
```

Stop & clean:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f api
docker compose logs -f dashboard
```
