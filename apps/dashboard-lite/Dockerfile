# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS build
WORKDIR /app
ENV HUSKY=0
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy monorepo manifest + ALL tsconfig variants required by per-package builds
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig*.json ./
COPY apps apps
COPY packages packages
COPY configs configs
COPY apex apex

# Install only what dashboard-lite (and local deps) need
RUN pnpm install --frozen-lockfile --filter "./apps/dashboard-lite..." --filter "./packages/*"

# Build the app
RUN pnpm -C apps/dashboard-lite build
# Optional postbuild (best-effort, don’t fail build)
RUN pnpm -C apps/dashboard-lite --silent exec bash .ci/postbuild.sh || true

# Runtime: serve static assets via nginx
FROM nginx:alpine
COPY --from=build /app/apps/dashboard-lite/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
