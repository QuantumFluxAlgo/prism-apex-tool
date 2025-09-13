# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm i -g pnpm@9 && pnpm fetch || true

FROM node:20-alpine AS build
WORKDIR /app
RUN npm i -g pnpm@9
COPY . .
RUN pnpm -w -C packages/data-yahoo build && \
    pnpm -w -C packages/risk-state build && \
    pnpm -w -C packages/strategy-apx-ddb01 build && \
    pnpm -w -C apps/ingress-yahoo-dev build

FROM node:20-alpine
WORKDIR /app
RUN npm i -g pnpm@9
COPY --from=build /app .
ENV PORT=8080
EXPOSE 8080
CMD ["pnpm","-C","apps/ingress-yahoo-dev","start"]
