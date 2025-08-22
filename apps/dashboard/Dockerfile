# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable

# Copy manifests for cache
COPY package.json pnpm-lock.yaml ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps apps
COPY packages packages
COPY sdks sdks
COPY tests tests
COPY tsconfig.base.json tsconfig.base.json

# Install deps
RUN pnpm install --frozen-lockfile=false

# Build dashboard only (avoid building all if desired)
WORKDIR /app/apps/dashboard
RUN pnpm run build

# ---- Nginx stage ----
FROM nginx:1.27-alpine AS runtime

ENV NODE_ENV=production

# Copy static build
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html

# Use our nginx config
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
