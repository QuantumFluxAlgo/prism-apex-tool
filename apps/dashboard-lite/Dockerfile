# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm i -g pnpm@9
COPY package.json pnpm-lock.yaml* ./
RUN pnpm fetch || true

FROM node:20-alpine AS build
WORKDIR /app
RUN npm i -g pnpm@9
COPY . .
# Build web (vite) and server (tsc)
pnpm -w -C apps/dashboard-lite build || true
# Copy web dist for serving
pnpm -w -C apps/dashboard-lite --silent exec bash .ci/postbuild.sh || true

FROM node:20-alpine
WORKDIR /app
RUN npm i -g pnpm@9
COPY --from=build /app .
ENV NODE_ENV=production
ENV DASHBOARD_LITE_PORT=5178
ENV APEX_TICKETS_DIR=/app/tickets
EXPOSE 5178
CMD ["pnpm","-C","apps/dashboard-lite","start"]
