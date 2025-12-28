cd "$(git rev-parse --show-toplevel)"
docker compose -f docker-compose.v2.local.yml down
docker compose -f docker-compose.v2.local.yml up -d
