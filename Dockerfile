FROM node:20-bookworm AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY . .
FROM base AS build
RUN pnpm i --offline --ignore-scripts
RUN pnpm -w --if-present --filter "./packages/**" run build
RUN pnpm -w --if-present --filter "./apps/**" run build

FROM node:20-slim AS api
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app ./
RUN pnpm -w -C apps/api i --prod --offline --ignore-scripts
EXPOSE 3000
CMD ["node","apps/api/dist/index.cjs"]

FROM nginx:1.27-alpine AS dashboard
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
