SHELL := /bin/bash

LOCAL_PROFILES := --profile local
PROD_PROFILES  := --profile prod
DEV_PROFILES   := --profile dev
JOBS_PROFILE   := --profile jobs

.PHONY: up down ps logs health seed up-dev down-dev prod-up prod-down prod-logs prod-seed smoke

up:
	@echo "Bringing up local stack (db, api, dashboard, ingress, cron jobs)..."
	docker compose $(LOCAL_PROFILES) up -d
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

prod-down:
	docker compose $(PROD_PROFILES) down

prod-logs:
	docker compose $(PROD_PROFILES) logs --tail=200

prod-seed:
	@echo "Seeding production data (ingest, gapfill, tickets)..."
	docker compose $(PROD_PROFILES) $(JOBS_PROFILE) run --rm ingest-once
	docker compose $(PROD_PROFILES) $(JOBS_PROFILE) run --rm gapfill-once
	docker compose $(PROD_PROFILES) $(JOBS_PROFILE) run --rm tickets-once || true

smoke:
	./scripts/smoke.sh
