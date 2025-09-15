# ==== build stage ====
FROM node:20-alpine AS build
WORKDIR /app
ENV CI=1
# Enable pnpm deterministically
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
# Copy lockfiles first for better caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# Copy the rest of the monorepo
COPY . .
# Install deps and build all packages/apps
RUN pnpm install --frozen-lockfile
RUN pnpm -r --filter @prism-apex/api... build

# ==== runtime stage for API ====
FROM node:20-alpine AS api
WORKDIR /app
# Install curl for reliable healthchecks
RUN apk add --no-cache curl
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    APEX_DATA_DIR=/data \
    PORT=3000
# Copy only what's needed at runtime
COPY --from=build /app/apps/api /app/apps/api
COPY --from=build /app/packages /app/packages
COPY --from=build /app/configs /app/configs
COPY --from=build /app/apex /app/apex
# Install production deps (respect lockfile)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=build /usr/local/bin/pnpm /usr/local/bin/
RUN pnpm install --frozen-lockfile --prod

EXPOSE 3000
VOLUME ["/data"]

# Healthcheck: API should return {"ok":true} on /health
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/health | grep -q '"ok":true' || exit 1

# NOTE: if your compiled entrypoint differs, adjust the path below.
CMD ["node","apps/api/dist/server.cjs"]
