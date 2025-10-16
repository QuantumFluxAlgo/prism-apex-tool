

## Development


### Development Guardrails

- **Node toolchain:** Target **Node 20.x LTS** with `pnpm`; linting uses the flat ESLint config in `.eslint`. TypeScript configs live in `tsconfig.base.json` with project references per package.
- **Testing:**
  - `pnpm lint`, `pnpm typecheck`, `pnpm test` (vitest) are the usual quality gates.
  - `pnpm run scan:dead` (depcheck) surfaces unused dependencies.
- **Python:** When Python utilities are touched, stick to Python 3.11, `ruff`, and `pytest` conventions.
- **Danger zones:** Any code path that mentions “placeOrder”, “submitOrder”, etc. must remain disabled or guarded — the scan heuristics surface these so we can confirm they stay dormant.

---

### Key Manifests & Tooling

- **compose_files**: 13
  - `docker-compose.api.override.yml`
  - `docker-compose.dashboard-full.yml`



  - `docker-compose.dashboard.rollupfix.yml`
  - `docker-compose.dashboard.yml`
  - `docker-compose.ingress.yml`
  - `docker-compose.override.local.yml`
  - `docker-compose.override.orr-sync.yml`
  - `docker-compose.override.yml`
  - `docker-compose.prod.yml`
  - `docker-compose.yml`
- **dockerfiles**: 5
  - `Dockerfile`
  - `apps/api/Dockerfile`

  - `apps/dashboard/Dockerfile`
  - `apps/ingress-yahoo-dev/Dockerfile`
- **package_json**: 369
  - `apps/api/node_modules/@asteasolutions/zod-to-openapi/package.json`
  - `apps/api/node_modules/@eslint/js/package.json`
  - `apps/api/node_modules/@fastify/autoload/package.json`
  - `apps/api/node_modules/@fastify/autoload/test/commonjs/index-error/package/package.json`
  - `apps/api/node_modules/@fastify/autoload/test/commonjs/index-package/package.json`
  - `apps/api/node_modules/@fastify/autoload/test/commonjs/package.json`
  - `apps/api/node_modules/@fastify/autoload/test/module/index-package/package.json`
  - `apps/api/node_modules/@fastify/autoload/test/module/package.json`
  - `apps/api/node_modules/@fastify/autoload/test/typescript-esm/package.json`
  - `apps/api/node_modules/@fastify/cors/benchmark/package.json`
  - `apps/api/node_modules/@fastify/cors/package.json`
  - `apps/api/node_modules/@fastify/formbody/package.json`
  - `apps/api/node_modules/@fastify/sensible/package.json`
  - `apps/api/node_modules/@prism-apex/accounts/node_modules/@eslint/js/package.json`
  - `apps/api/node_modules/@prism-apex/accounts/node_modules/eslint/package.json`
  - `apps/api/node_modules/@prism-apex/accounts/node_modules/prettier/package.json`
  - `apps/api/node_modules/@prism-apex/accounts/node_modules/typescript-eslint/package.json`
  - `apps/api/node_modules/@prism-apex/accounts/node_modules/typescript/package.json`
  - `apps/api/node_modules/@prism-apex/accounts/node_modules/vitest/package.json`
  - `apps/api/node_modules/@prism-apex/accounts/package.json`
  - ...
- **pnpm_lock**: 1
  - `pnpm-lock.yaml`
- **pyproject**: 0
- **requirements**: 1
  - `requirements.txt`
- **makefiles**: 1
  - `Makefile`

### Local Development

- Run `make dashboard` for local API/UI.
- Calibration: `make calibrate`.
- Payouts: `make payouts`.

### Contributing (Docs/Tooling)

- Keep PRs focused and small; scope to docs/tooling improvements.
- Never add automated order placement, liquidation logic, or other trading automation in this path.
- Target the `Test` branch (never main) and note operator impact in the PR description.

### What Good Looks Like

**Dry-run (expected):**
```text
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Git root: /…/prism-apex-tool-Test
Dry run: 1

-- Files to delete (untracked, in allow-listed dirs): 0
  (none)

-- Directories to delete recursively (build caches): 2
  - .next
  - .turbo
(auto-continue: dry-run or AUTO_YES set or non-interactive)
[DRY-RUN] No deletions performed.
```

**Execute with AUTO_YES (expected when there are candidates):**
```text
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Git root: /…/prism-apex-tool-Test
Dry run: 0

-- Files to delete (untracked, in allow-listed dirs): 3
  - tmp/sim.log
  - data/snap/cache.bin
  - .cache/test.idx

-- Directories to delete recursively (build caches): 1
  - .turbo

removed dir .turbo
deleted tmp/sim.log
deleted data/snap/cache.bin
deleted .cache/test.idx
rmdir tmp (empty)
Done.
```

> If the output lists tracked files or non-allow-listed paths, **stop and investigate** before proceeding.

### Maintenance & Ownership
- **Owners**: Tooling/Docs maintainers (this path is docs/tooling-only).
- **Scope**: Do **not** introduce order placement, liquidation logic, or strategy changes here.
- **How to contribute**: Open a small PR to `Test` with operator impact noted; keep edits scoped to docs/tooling.
- **Operating posture**: Tickets-only remains in force—operators still copy tickets into Tradovate OCO manually.

### Prerequisites & Compatibility
- **Git** installed with the repository cloned locally (script runs from repo root).
- **Shell**: POSIX-compatible (bash/zsh); supported on **macOS**, **Linux**, and **WSL**. PowerShell users can use `$env:` syntax from the Platform Notes section.
- **Docker** (optional): required only if you run the follow-up compose smoke checks; the cleanup itself has no Docker dependency.

### Env Vars Quick Reference
| Variable | Default | When to override | Effect |
|----------|:-------:|------------------|--------|
| `DRY_RUN` | `1` | Set `DRY_RUN=0` to perform deletions. | Toggle between preview and actual cleanup. |
| `AUTO_YES` | `0` | Set `AUTO_YES=1` for non-interactive runs (CI/scripts). | Skips the confirmation prompt when `DRY_RUN=0`. |

[↩︎ Back to top](#safe-cleanup-script-safe_cleanupsh)
<!-- END: SAFE_CLEANUP_DOC -->





---
**From:** `docs/simulator/overview.md`

# Prism Apex Risk Simulator
