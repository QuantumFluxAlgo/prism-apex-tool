# syntax=docker/dockerfile:1.6

########## BUILD ##########
FROM node:20-alpine AS build
WORKDIR /repo
ENV HUSKY=0
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Workspace + configs required by builds
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig*.json ./
COPY apps apps
COPY packages packages
COPY configs configs
COPY types types
COPY apex apex

# Install all deps once for the workspace
RUN pnpm install --frozen-lockfile

# Build just the API and any local deps it needs
RUN pnpm -r --filter "@prism-apex/api" --filter "./packages/*" build

# Produce a deployable, pruned copy of the API package
RUN pnpm -r deploy --filter "@prism-apex/api" --prod /opt/app

########## RUNTIME ##########
FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production \
    HUSKY=0 \
    PORT=3000 \
    APEX_DATA_DIR=/data

# Copy the deployed API (includes node_modules and built files)
COPY --from=build /opt/app /app
# also copy built dist for start-runtime fallback
COPY --from=build /repo/apps/api/dist /app/apps/api/dist

# Our runtime entry starts Fastify from the compiled bundle
COPY apps/api/start-runtime.cjs apps/api/start-runtime.cjs

EXPOSE 3000
VOLUME ["/data"]
CMD ["node","apps/api/start-runtime.cjs"]
