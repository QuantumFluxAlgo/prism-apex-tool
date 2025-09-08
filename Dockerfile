# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /work
ENV CI=1

# Ensure pnpm 9.x so `pnpm deploy` is available
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate

# Bring sources and build
COPY . .
RUN pnpm install
RUN pnpm -r --if-present build

# Create a runtime bundle that includes ONLY prod deps for apps/api
RUN mkdir -p /runtime \
 && pnpm --filter "@prism-apex-tool/api" deploy /runtime --prod \
 && mkdir -p /runtime/apps/api/dist \
 && cp -r /work/apps/api/dist/* /runtime/apps/api/dist/
RUN node /work/scripts/build-openapi.js || true

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    TRUST_PROXY=true \
    DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3000

# Copy the deployed runtime bundle
COPY --from=builder /runtime/ .

# Include non-NPM assets referenced by compiled code
COPY --from=builder /work/apex /app/apex
COPY --from=builder /work/configs /configs

# Start the API
CMD ["node","apps/api/dist/index.js"]
