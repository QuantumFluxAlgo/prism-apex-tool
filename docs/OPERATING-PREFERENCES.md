# Prism Apex Operating Preferences

- **Approvals**: `APPROVE_WRITE=true`, `APPROVE_RUN=true`, `APPROVE_PR=true`.
- **Branching**: Start from `Test`, branch per feature/fix, target PRs to `Test`.
- **Docker-first**: Build, run, and test via `docker compose`; avoid host-specific tooling.
- **Repeatability**: Pin dependencies, keep scripts idempotent, and maintain one-command startup paths.
- **Cleanup mandate**: Replace or remove ad-hoc scripts that bypass Docker.
- **Protected paths**: `strategy/*`, `guardrails/*`, `infra/ci-cd/*`, `services/telemetry` (writes), and `data/(balances|positions|fills)/*`.
- **Quality gates**: JS/TS → `pnpm lint`, `pnpm typecheck`, `pnpm test`; Python → `ruff --fix`, `black --check`, `pytest -q`.
- **PR etiquette**: Conventional commits, squash-friendly history, include an outcome report.
- **Worklist PnL**: Keep `config/contracts-spec.json` current; set `tickSpecVerified=true` only after sign-off so dashboard PnL stays trustworthy. Update `VITE_API_BASE` when API hosts change.
- **Docker images**: Rebuild via `docker compose build api dashboard-full` whenever contracts specs or dashboard code changes, ensuring operators see the latest data.
