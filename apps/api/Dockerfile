# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install root deps & workspace tooling (assumes workspaces)
COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/dashboard/package*.json apps/dashboard/
COPY packages/shared/package*.json packages/shared/
COPY packages/rules-apex/package*.json packages/rules-apex/
COPY packages/signals/package*.json packages/signals/
COPY packages/clients-tradovate/package*.json packages/clients-tradovate/

RUN npm ci

# Copy sources
COPY . .

# Build shared libs first (if using TS project refs, skip to root build)
RUN npm run build -w packages/shared || true
RUN npm run build -w packages/rules-apex || true
RUN npm run build -w packages/signals || true
RUN npm run build -w packages/clients-tradovate || true
RUN npm run build -w apps/api

# ---------- Runtime stage ----------
FROM node:20-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=8080
# Data dir for store
ENV DATA_DIR=/var/lib/prism-apex-tool

# Create non-root user
RUN addgroup -S app && adduser -S app -G app
RUN mkdir -p ${DATA_DIR} && chown -R app:app ${DATA_DIR}

# Only copy needed files
COPY --from=builder /usr/src/app/apps/api/package*.json ./apps/api/
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/apps/api/dist ./apps/api/dist

USER app

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
