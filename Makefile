COMPOSE=docker compose -f docker-compose.yml

.PHONY: up down build logs
up:
	$(COMPOSE) up -d --build
	down:
	$(COMPOSE) down
build:
	$(COMPOSE) build --no-cache
logs:
	$(COMPOSE) logs -f --tail=200
