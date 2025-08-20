SHELL := /bin/bash

.PHONY: help up down seed backtest backtest-tick demo
help:
	@echo "Targets:"
	@echo "  deps           Install deps"
	@echo "  build          Build all workspaces"
	@echo "  test           Run all unit tests"
	@echo "  e2e            Run dashboard Playwright e2e"
	@echo "  up             docker compose up -d"
	@echo "  down           docker compose down"
	@echo "  logs           docker compose logs -f"
	@echo "  seed           Seed API store with demo data"
	@echo "  backtest       Run ORB backtest on sample data"
	@echo "  demo           Build CLI and run sample backtest"

deps:
	npm ci

build:
	npm run build -w packages/shared || true
	npm run build -w packages/rules-apex || true
	npm run build -w packages/signals || true
	npm run build -w packages/clients-tradovate || true
	npm run build -w apps/api
	npm run build -w apps/dashboard

test:
	npm test -w packages/shared --silent
	npm test -w packages/rules-apex --silent
	npm test -w packages/signals --silent
	npm test -w packages/clients-tradovate --silent
	npm test -w apps/api --silent

e2e:
	npx playwright install --with-deps chromium
	npm run e2e -w apps/dashboard

up:
	docker compose up -d

down:
	docker compose down

logs:
		docker compose logs -f

seed:
	@echo "Seeding API store..."
	@DATA_DIR=.data node --loader ts-node/esm apps/api/scripts/seed.ts

backtest:
        @echo "Running sample backtest (ORB, ES 1m)..."
        @mkdir -p out
        @./node_modules/.bin/tsx apps/cli/src/backtest.ts --strategy=ORB --data=data/ES_1m.sample.csv --mode=evaluation --open=14:30 --close=21:59 --tickValue=50 --seed=42 --out=out/es_orb_sample

.PHONY: backtest-tick
backtest-tick:
        @node apps/cli/dist/backtest.js --strategy=ORB --modeReplay=tick --tickData=data/ES_ticks.sample.csv --mode=evaluation --open=14:30 --close=21:59 --tickValue=50 --seed=42 --out=out/es_orb_tick

demo:
	@bash apps/cli/scripts/demo.sh

.PHONY: release deploy

# Create a signed tag and push (CI will build & deploy)
release:
	@if [ -z "$$TAG" ]; then echo "Usage: make release TAG=v0.1.0"; exit 2; fi
	git tag -a $$TAG -m "Release $$TAG"
	git push origin $$TAG

# Convenience local wrapper to call remote deploy script (requires same secrets exported)
deploy:
	@if [ -z "$$PROD_SSH_HOST" ] || [ -z "$$PROD_SSH_USER" ] || [ -z "$$PROD_STACK_DIR" ] || [ -z "$$STACK_NAME" ]; then echo "Set PROD_SSH_HOST, PROD_SSH_USER, PROD_STACK_DIR, STACK_NAME, TAG, GHCR_OWNER"; exit 2; fi
	ssh $$PROD_SSH_USER@$$PROD_SSH_HOST "STACK_NAME=$$STACK_NAME TAG=$$TAG GHCR_OWNER=$$GHCR_OWNER STACK_DIR=$$PROD_STACK_DIR bash $$PROD_STACK_DIR/scripts/deploy.sh"

.PHONY: readiness uat

# Print path to go-live checklist (for convenience)
readiness:
	@echo "Open docs/release/go-live-checklist.md"

# Print path to UAT scripts
uat:
	@echo "Open docs/release/uat-scenarios.md"

.PHONY: deck cards

deck:
	@echo "Open docs/operator/training-deck.md"

cards:
	@echo "Quick cards:"
	@ls -1 docs/operator/quick-cards/*.md

.PHONY: calibrate

calibrate:
	python -m calibration.run_sweeps
	@echo "Results in reports/calibration/results.csv and results.json"

.PHONY: payouts

payouts:
	python payouts/tracker.py
	@echo "See reports/payouts/summary.json and docs/payouts/calendar.md"

.PHONY: notify-test

notify-test:
	python -c "from notifications.notify import notify; notify('Test Alert','This is a test')"



.PHONY: dashboard

dashboard:
	npm --prefix frontend install
	(uvicorn api.dashboard:app --reload &) && npm --prefix frontend run dev

.PHONY: audit-test

audit-test:
        python -c "from audit.logger import log_event; log_event('SYSTEM_EVENT','Audit system test')"
        @echo "Check logs/audit/ for new entries"

.PHONY: multi-check copy-sim

multi-check:
	@curl -s http://localhost:8000/api/rules/cross/check | jq .

copy-sim:
	@curl -s -X POST http://localhost:8000/api/copytrader/preview \
 -H 'content-type: application/json' \
 -d '{"traderGroupId":"tg-sean-01","baseAccountId":"Apex-ES-50k-1","symbol":"ES","side":"BUY","entry":5000,"stop":4990,"target":5010,"baseSize":1,"mode":"evaluation"}' | jq .

.PHONY: strat-now strat-sim

strat-now:
	@curl -s http://localhost:8000/api/strategy/active | jq .

strat-sim:
	@python scripts/simulate_strategy_day.py
