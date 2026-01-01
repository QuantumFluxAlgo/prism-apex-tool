
## Local development
authorized entrypoint
- Use `bash tools/codex/dc_local.sh ...` to run compose commands; it hard-codes `docker-compose.v2.local.yml`, so no one glues the wrong variant to Compose.
- Always run `bash tools/codex/stabilize_5180.sh all` to boot the canonical stack.
- Run `bash tools/codex/guard_ports_local.sh` (pre-commit/CI hook) before committing port changes.
