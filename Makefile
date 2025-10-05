COMPOSE=docker compose -f docker-compose.yml -f docker-compose.db.yml

.PHONY: up down build logs
up:
	$(COMPOSE) up -d --build
	down:
	$(COMPOSE) down
build:
	$(COMPOSE) build --no-cache
logs:
	$(COMPOSE) logs -f --tail=200

.PHONY: ps maint
ps:
	$(COMPOSE) ps
maint:
	$(COMPOSE) run --rm db_maint sh -lc 'psql "$$DATABASE_URL" -v ON_ERROR_STOP=1 -f /maintenance/maintenance.sql && echo "VACUUM ANALYZE completed"'

.PHONY: gapfill
gapfill:
	$(COMPOSE) run --rm gapfill-once
