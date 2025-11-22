SHELL := /bin/bash

LOCAL_PROFILES := --profile local
PROD_PROFILES  := --profile prod
DEV_PROFILES   := --profile dev
JOBS_PROFILE   := --profile jobs
TOOLS_DIR      := tools/codex
ENABLE_RT      := $(TOOLS_DIR)/enable-realtime.sh

.PHONY: up down ps logs health seed up-dev down-dev prod-up prod-down prod-logs prod-seed smoke wait-db-local wait-db-prod proxy-up proxy-down proxy-logs

up:
	@echo "Bringing up local stack (db, api, dashboard, ingress, cron jobs)..."
	docker compose $(LOCAL_PROFILES) up -d
	@echo "Wiring governed realtime services..."
	@COMPOSE_PROFILES=local $(ENABLE_RT)
	@$(MAKE) seed
	@$(MAKE) health

down:
	docker compose $(LOCAL_PROFILES) down

ps:
	docker compose ps

logs:
	docker compose logs --tail=200

health:
	@echo "API:       " && curl -fsS http://localhost:3000/health || true
	@echo "Ingress:   " && curl -fsS http://localhost:8080/health || true
	@echo "Dashboard: " && curl -fsSI http://localhost:5180/ | head -n1 || true

seed:
	@$(MAKE) wait-db-local
	@echo "Running one-time ingestion jobs..."
	docker compose $(LOCAL_PROFILES) $(JOBS_PROFILE) run --rm ingest-once
	docker compose $(LOCAL_PROFILES) $(JOBS_PROFILE) run --rm gapfill-once
	docker compose $(LOCAL_PROFILES) $(JOBS_PROFILE) run --rm tickets-once || true

up-dev:
	docker compose $(DEV_PROFILES) up -d dashboard-dev

down-dev:
	docker compose $(DEV_PROFILES) down

prod-up:
	@echo "Bringing up production stack..."
	docker compose $(PROD_PROFILES) up -d
	@echo "Wiring governed realtime services (prod)..."
	@COMPOSE_PROFILES=prod $(ENABLE_RT)
	@$(MAKE) prod-seed

prod-down:
	docker compose $(PROD_PROFILES) down

prod-logs:
	docker compose $(PROD_PROFILES) logs --tail=200

prod-seed:
	@$(MAKE) wait-db-prod
	@echo "Seeding production data (ingest, gapfill, tickets)..."
	docker compose $(PROD_PROFILES) $(JOBS_PROFILE) run --rm ingest-once
	docker compose $(PROD_PROFILES) $(JOBS_PROFILE) run --rm gapfill-once
	docker compose $(PROD_PROFILES) $(JOBS_PROFILE) run --rm tickets-once || true

wait-db-local:
	@echo "Waiting for local Postgres to accept connections..."
	@until docker compose $(LOCAL_PROFILES) exec -T db pg_isready -U $${PGUSER:-apex} -d $${PGDATABASE:-prismapex} >/dev/null 2>&1; do \
		sleep 2; \
	done
	@echo "Local Postgres is ready."

wait-db-prod:
	@echo "Waiting for production Postgres to accept connections..."
	@until docker compose $(PROD_PROFILES) exec -T db pg_isready -U $${PGUSER:-apex} -d $${PGDATABASE:-prismapex} >/dev/null 2>&1; do \
		sleep 2; \
	done
	@echo "Production Postgres is ready."

smoke:
	./scripts/smoke.sh

quick-up:
	docker compose up -d db
	sleep 2
	docker compose up -d api
	docker compose ps

proxy-up:
	@if [ -n "$${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then \
		echo "Starting reverse proxy + Cloudflare named tunnel (token detected)..."; \
		docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d reverse-proxy cloudflare-named; \
	else \
		echo "Starting reverse proxy + Cloudflare quick tunnel (ephemeral trycloudflare URL)..."; \
		docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d reverse-proxy cloudflare-quick; \
		echo "TIP: tail logs for the tunnel URL → docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml logs -f cloudflare-quick | grep -m1 trycloudflare"; \
	fi

proxy-down:
	@echo "Stopping reverse proxy + Cloudflare tunnels..."
	@docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml stop reverse-proxy cloudflare-quick cloudflare-named >/dev/null 2>&1 || true
	@docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml rm -f reverse-proxy cloudflare-quick cloudflare-named >/dev/null 2>&1 || true

proxy-logs:
	docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml logs -f reverse-proxy cloudflare-quick cloudflare-named
