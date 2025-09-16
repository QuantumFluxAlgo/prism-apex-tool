
Developer Guide
Ports at a glance

API (prod-like via compose): 3000

Dashboard-Lite (compose): 5178

Full Dashboard (compose): 8080

API (dev script, if provided): 8000 (hot-reload)

Dev workflow (hot reload, if scripts exist)
./dev_api.sh              # API on :8000 (Fastify watch) — optional
pnpm --filter @prism-apex/dashboard-lite dev   # Vite dev UI on :5173 (if applicable)

Prod-like workflow (Docker)
docker compose up -d --build
docker compose -f docker-compose.yml -f docker-compose.dashboard-lite.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.dashboard-full.yml up -d --build

Sanity checks
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3000/ready

Notes

This repo may contain pre-existing lint/typecheck/test failures; CI runs are non-blocking except for the no-order-API guard, which is hard-fail by design.

If Docker is not installed locally, compose builds will be skipped. Install Docker to run containers.

Absolute rule

The codebase must never introduce broker order placement (tickets-only). CI enforces this at PR time.

### API-focused commands
- `pnpm build:api` — build only the API workspace and its deps
- `pnpm typecheck:api` — typecheck API scope
- `pnpm test:api` — run API tests only

### API bundling
- Runtime artifact is **CommonJS**: `apps/api/dist/server.cjs` (bundled by **tsup**).
- Typechecking remains via `tsc --noEmit` using `tsconfig.build.json`.
- If your entry file is not `src/server.ts`, update `apps/api/tsup.config.ts`.

### Path aliases
- Source of truth: `tsconfig.paths.json`. `tsconfig.base.json` extends it so every workspace inherits the same `paths` map.
- Use the `@prism-apex/<workspace>` pattern when importing. Examples:
  - `@prism-apex/app-api/*` → `apps/api/src/*`
  - `@prism-apex/rules-apex/*` → `packages/rules-apex/src/*`
- Vitest pulls in the map via the `vite-tsconfig-paths` plugin (see the shared `vitest.config.ts` family), and Node-based setups/scripts load `tsconfig-paths/register` (e.g., `apps/api/test.setup.ts`).
- Update `tsconfig.paths.json` whenever folders move; the rest follows automatically.
