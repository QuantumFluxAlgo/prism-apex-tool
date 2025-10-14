SHELL := /bin/bash
export COMPOSE_FILE := docker-compose.yml:docker-compose.override.yml:docker-compose.db.yml:docker-compose.dashboard-full.yml:docker-compose.ingress.yml:docker-compose.api.override.yml:docker-compose.override.local.yml:docker-compose.local.patch.yml:docker-compose.local.instruments.yml:docker-compose.local.ports.yml:docker-compose.tickets-cron.yml

.PHONY: up down ps logs health ingest-once tickets-once

up:
	@echo "Bringing up full stack (db, api, dashboard, ingress, gapfill-cron, tickets-cron)..."
	docker compose up -d db
	docker compose exec -T db bash -lc 'until pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; do sleep 1; done'
	docker compose up -d --build api dashboard-full ingress-yahoo gapfill-cron tickets-cron
	@$(MAKE) health

down:
	docker compose down

ps:
	docker compose ps

logs:
	docker compose logs --tail=200

health:
	@echo "API:       " && curl -sS http://localhost:3000/health || true
	@echo "Ingress:   " && curl -sS http://localhost:8080/health || true
	@echo "Dashboard: " && curl -sSI http://localhost:5180/ | head -n1 || true

ingest-once:
	docker compose run --rm ingest-once

tickets-once:
	docker compose run --rm tickets-once || true
