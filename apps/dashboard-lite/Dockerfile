# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS build
WORKDIR /app
ENV HUSKY=0
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy just enough of the monorepo to build dashboard-lite
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps apps
COPY packages packages
COPY configs configs
COPY tsconfig.base.json tsconfig.base.json
# Include apex rules so any transitive build that references them won't fail
COPY apex apex

# Install only what dashboard-lite (and its local deps) needs
RUN pnpm install --frozen-lockfile --filter "./apps/dashboard-lite..." --filter "./packages/*"

# Build the app
RUN pnpm -C apps/dashboard-lite build
# Optional, best-effort
RUN pnpm -C apps/dashboard-lite --silent exec bash .ci/postbuild.sh || true

# Runtime: serve static assets via nginx
FROM nginx:alpine
COPY --from=build /app/apps/dashboard-lite/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
