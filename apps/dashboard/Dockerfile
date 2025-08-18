# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/dashboard/package*.json apps/dashboard/
COPY packages/shared/package*.json packages/shared/

RUN npm ci

# Copy sources
COPY . .

# Build shared first (in case Dashboard imports shared types for typegen)
RUN npm run build -w packages/shared || true

# Build dashboard static assets
RUN npm run build -w apps/dashboard

# ---------- Nginx stage ----------
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Copy static dist
COPY --from=builder /usr/src/app/apps/dashboard/dist/ ./

# Replace default conf
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
