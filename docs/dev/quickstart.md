# Prism Apex – Dev Quickstart

This guide gives you three one-liners to prove the MVP works locally without real credentials.

---

## 0) Prereqs
- Node 20+
- npm workspaces installed (`npm ci` at repo root)
- (Optional) Docker if you want to run the API in containers

---

## 1) Seed the API store (safe demo state)
```bash
make seed
```

Outputs: `.data/state.json` with demo tickets, recipients, and risk context.

## 2) Run a sample backtest (ORB on ES 1m)
```bash
make backtest
```

Outputs:
- `out/es_orb_sample.json` (summary)
- `out/es_orb_sample-fills.csv`
- `out/es_orb_sample-daily.csv`

## 3) Full demo script
```bash
make demo
```

Builds CLI, runs backtest, writes results to `./out`.

### What you should see
- JSON summary printed to console.
- CSV files with fills and per-day PnL.
- No network calls or secrets required.

---

## Next Steps
- Point the API to read-only Tradovate credentials (when ready).
- Connect Slack/Telegram tokens to receive alerts (Prompt 18).
- Follow the Operator Handbook (Prompt 21) for the manual input workflow.

---

**QUALITY GATES (must pass)**  
- `make seed` creates `.data/state.json` without errors.  
- `make backtest` writes `out/es_orb_sample.*` files and prints a JSON summary.  
- `make demo` runs end-to-end without external dependencies.  
- All new TS compiles with `tsc` (strict) and no `any`.

**COMPLETION CHECK**  
Files created/updated:

- `data/ES_1m.sample.csv`  
- `apps/api/scripts/seed.ts`  
- `apps/cli/scripts/demo.sh`  
- `Makefile` (new targets)  
- `docs/dev/quickstart.md`  
