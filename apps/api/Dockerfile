# ---- Build (install dev deps to run tsup) ----
FROM node:20-alpine AS build
WORKDIR /app

# Workspaces-friendly installs: copy root files first
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
# Copy API package manifest to ensure correct hoisting
COPY apps/api/package.json apps/api/
# Install only needed dependencies for building
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --filter @prism-apex-tool/api... --unsafe-perm

# Copy source
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Build API
WORKDIR /app/apps/api
RUN pnpm run build

# ---- Runtime (lean) ----
FROM node:20-alpine AS runtime
WORKDIR /srv/api

ENV NODE_ENV=production
ENV PORT=8000
EXPOSE 8000

# A writable data dir for local state
ENV DATA_DIR=/var/lib/prism-apex-tool
RUN mkdir -p ${DATA_DIR}

# Copy built artifacts and prod deps
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
# Install production-only deps for runtime
RUN corepack enable && corepack prepare pnpm@latest --activate \
 && pnpm install --prod --ignore-scripts

CMD ["node", "--enable-source-maps", "dist/index.js"]
