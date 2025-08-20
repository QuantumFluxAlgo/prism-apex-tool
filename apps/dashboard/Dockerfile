# ---- Build static site ----
FROM node:20-alpine AS build
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/dashboard/package.json apps/dashboard/
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --filter prism-apex-dashboard... --unsafe-perm

# Copy sources needed for dashboard build
COPY apps/dashboard ./apps/dashboard
# If UI imports shared packages in the monorepo, include them here too
COPY packages ./packages
COPY tsconfig.base.json ./

WORKDIR /app/apps/dashboard
# Build with base path at /
RUN pnpm run build

# ---- Nginx runtime ----
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Static assets
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html

# Nginx config (expects an existing nginx.conf in the app)
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
