# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /work
ENV CI=1

# Enable pnpm via Corepack
RUN corepack enable

# Bring everything (simplest + reliable for monorepo workspaces)
COPY . .

# Install all deps (workspace-aware), build all packages, then prune dev deps
RUN pnpm install
RUN pnpm -r --if-present build
RUN pnpm prune --prod

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app

# Sensible runtime defaults
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    TRUST_PROXY=true \
    DATA_DIR=/data

# Copy runtime node_modules (already pruned) and needed files
COPY --from=builder /work/node_modules ./node_modules
COPY --from=builder /work/package.json ./package.json
COPY --from=builder /work/pnpm-lock.yaml ./pnpm-lock.yaml

# Copy compiled API and workspace package outputs + manifests
COPY --from=builder /work/apps/api/package.json ./apps/api/package.json
COPY --from=builder /work/apps/api/dist ./apps/api/dist
COPY --from=builder /work/packages ./packages

# Persist local filesystem store
VOLUME ["/data"]

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
