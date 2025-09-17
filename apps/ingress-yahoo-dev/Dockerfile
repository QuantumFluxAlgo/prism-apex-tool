# syntax=docker/dockerfile:1

########## build ##########
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache bash curl \
 && corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY . .
ENV CI=1 HUSKY=0
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @prism-apex/data-yahoo build \
 && pnpm --filter @prism-apex/risk-state build \
 && pnpm --filter @prism-apex/strategy-apx-ddb01 build \
 && pnpm --filter @prism-apex/ingress-yahoo-dev build

########## runtime ##########
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl \
 && corepack enable && corepack prepare pnpm@9.0.0 --activate
ENV NODE_ENV=production
COPY --from=build /app /app
RUN pnpm -C apps/ingress-yahoo-dev install --prod --frozen-lockfile --ignore-scripts
RUN cat > /usr/local/bin/start-ingress <<'SH'
#!/bin/sh
set -e
for f in \
  /app/apps/ingress-yahoo-dev/dist-server/index.cjs \
  /app/apps/ingress-yahoo-dev/dist-server/index.js  \
  /app/apps/ingress-yahoo-dev/dist/index.cjs        \
  /app/apps/ingress-yahoo-dev/dist/index.js         \
  /app/apps/ingress-yahoo-dev/dist/server.cjs       \
  /app/apps/ingress-yahoo-dev/dist/server.js

do
  if [ -f "$f" ]; then
    exec node "$f"
  fi
done
echo "No dist entrypoint found under dist-server or dist" >&2
ls -l /app/apps/ingress-yahoo-dev || true
ls -l /app/apps/ingress-yahoo-dev/dist* || true
exit 1
SH
RUN chmod +x /usr/local/bin/start-ingress
ENV APEX_DATA_DIR=/data
VOLUME ["/data"]
CMD ["start-ingress"]
