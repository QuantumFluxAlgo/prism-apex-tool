# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS build
WORKDIR /app
ENV HUSKY=0
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy just what we need to build the web bundle
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig*.json ./
COPY apps apps
COPY packages packages
COPY configs configs
COPY apex apex

# Install only deps for dashboard-lite and local packages it needs
RUN pnpm install --frozen-lockfile --filter "./apps/dashboard-lite..." --filter "./packages/*"

# Build the Vite app (outputs to apps/dashboard-lite/web/dist)
RUN pnpm -C apps/dashboard-lite build
# Optional postbuild; best-effort
RUN pnpm -C apps/dashboard-lite --silent exec bash .ci/postbuild.sh || true

# Runtime: nginx serving the built assets
FROM nginx:alpine
COPY --from=build /app/apps/dashboard-lite/dist /usr/share/nginx/html
COPY apps/dashboard-lite/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
