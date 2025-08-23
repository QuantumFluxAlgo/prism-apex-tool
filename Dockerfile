# syntax=docker/dockerfile:1

########## 1) Builder (API-only, but keep repo-like paths) ##########
FROM node:20-slim AS builder
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# Create expected workspace-like layout
RUN mkdir -p apps/api

# Install API deps (dev deps included for build)
COPY apps/api/package.json apps/api/package.json
WORKDIR /app/apps/api
RUN pnpm install --ignore-scripts

# Bring in API build config, scripts, and sources
COPY apps/api/tsconfig.build.json tsconfig.build.json
COPY apps/api/scripts scripts
COPY apps/api/src src

# Bring in external data used by the API at repo root (e.g., apex/rules.json)
WORKDIR /app
COPY apex apex

# Build API (outputs to /app/apps/api/dist)
WORKDIR /app/apps/api
RUN pnpm run build

########## 2) Runner (minimal production) ##########
FROM node:20-slim AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# Copy built app + external data
COPY --from=builder /app/apps/api/dist dist
COPY --from=builder /app/apex /app/apex

# Install ONLY production deps for the API
COPY apps/api/package.json package.json
RUN pnpm install --prod --ignore-scripts

EXPOSE 8000
CMD ["node", "--enable-source-maps", "dist/index.js"]
