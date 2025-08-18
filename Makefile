SHELL := /bin/bash

.PHONY: help
help:
@echo "Targets:"
@echo "  deps           Install deps"
@echo "  build          Build all workspaces"
@echo "  test           Run all unit tests"
@echo "  e2e            Run dashboard Playwright e2e"
@echo "  up             docker compose up --build"
@echo "  down           docker compose down -v"
@echo "  logs           docker compose logs -f"

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
docker compose up --build -d

down:
docker compose down -v

logs:
docker compose logs -f
