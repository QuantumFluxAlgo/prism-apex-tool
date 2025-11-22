# ---- Build stage ----
FROM node:20-slim AS build

WORKDIR /app
ARG VITE_API_BASE
ENV CI=1 PNPM_CONFIG_PROD=false VITE_API_BASE=${VITE_API_BASE}
RUN corepack enable

# Copy manifests for cache (include workspace file so pnpm sees the monorepo)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps apps
COPY packages packages
COPY tests tests
COPY config config
COPY tsconfig.base.json tsconfig.base.json
COPY tsconfig.paths.json tsconfig.paths.json
COPY types types

# Install deps and build the dashboard only
RUN pnpm -w install --ignore-scripts && pnpm -C apps/dashboard build

# ---- Nginx stage ----
FROM nginx:1.27-alpine AS runtime

ENV NODE_ENV=production

# Copy static build
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html

# Use our nginx config from the repo
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
