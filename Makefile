SHELL := /bin/bash

LOCAL_PROFILES := --profile local
PROD_PROFILES  := --profile prod
DEV_PROFILES   := --profile dev
JOBS_PROFILE   := --profile jobs

.PHONY: up down ps logs health seed up-dev down-dev prod-up prod-down prod-logs prod-seed smoke wait-db-local wait-db-prod

up:
	@echo "Bringing up local stack (db, api, dashboard, ingress, cron jobs)..."
	docker compose $(LOCAL_PROFILES) up -d
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
