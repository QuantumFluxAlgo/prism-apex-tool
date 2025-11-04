# Data Recovery: Minute Bars Gapfill

Use the existing ingress job and one-shot compose service to backfill minute bars so tickets advance.

## Prerequisites
- Stack running (`api`, `db`, `ingress-yahoo`, `tickets-cron`).
- `compose.ingress-db.override.yml` and `compose.gapfill-once.override.yml` present.

## 1. Capture `DATABASE_URL`
```bash
API_ID=$(docker ps --format '{{.ID}} {{.Names}}' | awk 'tolower($0) ~ /(^|-)api(-| |$)/{print $1;exit}')
DBURL=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$API_ID" | awk -F= '$1=="DATABASE_URL"{print $2;exit}')
```

## 2. Run one-shot gapfill
```bash
export FROM_DATE="2025-10-31T00:00:00Z"
export TO_DATE="2025-11-05T00:00:00Z"
export SYMBOLS="ES=F,NQ=F,CL=F,EURUSD=X"

docker compose -f docker-compose.yml \
  -f compose.ingress-db.override.yml \
  -f compose.gapfill-once.override.yml \
  run --rm \
  -e DATABASE_URL="$DBURL" -e FROM_DATE -e TO_DATE -e SYMBOLS \
  gapfill-once
```

Server example: swap base compose path to server bundle.

## 3. Verify bar ceilings
```bash
DB_ID=$(docker ps --format '{{.ID}} {{.Names}}' | awk 'tolower($0) ~ /(^|-)db(-| |$)/{print $1;exit}')
for s in ES=F NQ=F CL=F EURUSD=X; do
  printf "%s: " "$s"
  docker exec "$DB_ID" psql -U apex -d prismapex -t -A -c "select coalesce(max(ts_utc)::text,'NULL') from public.bars_1m where symbol = '$s';"
done
```

## 4. Nudge tickets & check API
```bash
CRON_ID=$(docker ps --format '{{.ID}} {{.Names}}' | awk 'tolower($0) ~ /tickets.*cron/{print $1;exit}')
[ -n "$CRON_ID" ] && docker restart "$(docker inspect "$CRON_ID" -f '{{.Name}}' | sed s,^/,,)"

curl -sS "http://localhost:5190/api/tickets?limit=5" | jq .
```

## Troubleshooting
- If JS build ignores flags, ts-node fallback runs automatically.
- Ensure ingress receives the same `DATABASE_URL` as the API.
- If Yahoo returns data yet ceilings don’t move, verify schema/table names.

No helper scripts required—compose overrides live with the repo.

### If your compose file doesn’t define `db`
Use `compose.gapfill-once.nodeps.yml` instead of `compose.gapfill-once.override.yml`.
This variant removes `depends_on` so you can run gapfill against the live `DATABASE_URL` regardless of service names.
Example:
```bash
API_ID=$(docker ps --format '{{.ID}} {{.Names}}' | awk 'tolower($0) ~ /(^|-)api(-| |$)/{print $1;exit}')
DBURL=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$API_ID" | awk -F= '$1=="DATABASE_URL"{print $2;exit}')
export FROM_DATE="2025-10-31T00:00:00Z"
export TO_DATE="2025-11-05T00:00:00Z"
export SYMBOLS="ES=F,NQ=F,CL=F,EURUSD=X"
docker compose -f docker-compose.yml \
  -f compose.ingress-db.override.yml \
  -f compose.gapfill-once.nodeps.yml \
  run --rm -e DATABASE_URL="$DBURL" -e FROM_DATE -e TO_DATE -e SYMBOLS gapfill-once
```

## Standard post-deploy
Use the single entrypoint to backfill **all** symbols every time (local/server):
```bash
export COMPOSE_FILE=/path/to/docker-compose.yml
export FROM_DATE="2025-10-31T00:00:00Z"
export TO_DATE="2025-11-05T00:00:00Z"
pnpm run ops:postdeploy:gapfill
```

CI Auto-Run: `.github/workflows/postdeploy-gapfill.yml` runs this step on pushes to Test/main only on a self-hosted runner with Docker. Configure your runner and (optional) repo var COMPOSE_FILE.
