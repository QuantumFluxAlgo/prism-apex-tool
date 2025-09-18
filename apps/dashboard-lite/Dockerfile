# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS build
WORKDIR /app
ENV HUSKY=0
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace (keep it lean but sufficient for build)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps apps
COPY packages packages
COPY configs configs

# Install and build dashboard-lite
RUN pnpm install --frozen-lockfile
RUN pnpm -w -C apps/dashboard-lite build
# Optional postbuild (best-effort)
RUN pnpm -w -C apps/dashboard-lite --silent exec bash .ci/postbuild.sh || true

# Runtime: nginx serving built assets
FROM nginx:alpine
COPY --from=build /app/apps/dashboard-lite/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
