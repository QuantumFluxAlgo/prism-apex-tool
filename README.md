# Prism Apex Tool

Prism Apex Tool is a TypeScript monorepo supporting discretionary futures trading on Apex accounts. The system generates strategy tickets while a human operator manually enters orders into Tradovate.

## MVP Scope

- Strategies: **Open Session Breakout** and **VWAP First-Touch** for ES, NQ, MES and MNQ contracts.
- System suggests trades; the operator confirms and inputs orders manually.
- Absolutely no automatic order execution.

## Apex Guardrails (Non‑negotiable)

- Every trade requires a stop.
- Trailing drawdown protection enforced.
- Trade at half size until buffer is built.
- Daily profit share limited to ≤30%.
- Flat by end of day at **20:59 GMT**.

## Repository Structure

```
apps/
  api/            Fastify or Express API (future)
  dashboard/      React dashboard (future)
packages/
  shared/         Shared utilities (future)
  rules-apex/     Apex rule enforcement (future)
  signals/        Strategy signal generators (future)
  clients-tradovate/ Tradovate client adapters (future)
infra/            Deployment and runtime infrastructure (placeholder)
tests/            Integration and end-to-end tests (future)
```

## Local Setup
- Requires Node 20.x (`.nvmrc` / `.node-version`)
- Install: `pnpm install`
- Validate: `pnpm run validate`
- Versions: `pnpm run versions`

## PR Roadmap (Collapsed)
- PR‑00 Repo scan & dependency sanity
- PR‑01a API TypeScript baseline
- PR‑01b API entrypoint & start
- PR‑01c API smoke routes
- PR‑02 Ports & process
- PR‑03 Tests baseline
- PR‑04 Lint/format CI
- PR‑05 Typecheck CI
- PR‑06 Dead code cleanup
- PR‑07 Docs upkeep
- PR‑08 Strategies wiring check
