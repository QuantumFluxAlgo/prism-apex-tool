# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app
# Enable corepack to use pnpm reliably
RUN corepack enable

# Copy only manifests first for better layer caching
COPY package.json pnpm-lock.yaml ./
# Include workspace manifests for linking
COPY apps/api/package.json apps/api/package.json
COPY packages packages
COPY apps apps
COPY sdks sdks
COPY tests tests
COPY tsconfig.base.json tsconfig.base.json

# Install deps for entire workspace (no postinstall scripts)
RUN pnpm install --frozen-lockfile=false

# Build the workspace (types + bundles)
RUN pnpm -w run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
ENV DATA_DIR=/var/lib/prism-apex-tool

# Minimal runtime deps
RUN apk add --no-cache curl

# Copy built dist for API only
COPY --from=build /app/apps/api/dist ./apps/api/dist
# Copy package.json to allow "node dist/index.js" and any runtime resolves
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

# Non-root user (optional hardening)
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 8000
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
