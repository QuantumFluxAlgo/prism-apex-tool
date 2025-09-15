# ------------ Build stage ------------
FROM node:20-alpine AS build
WORKDIR /app

# Tools for building
RUN apk add --no-cache python3 make g++ curl && corepack enable

# Workspace manifests (cache-friendly)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.base.json

# Source
COPY packages packages
COPY apps apps
COPY sdks sdks
COPY tests tests
COPY apex apex

# Install all workspace deps (dev deps OK in build stage)
RUN pnpm install --frozen-lockfile=false

# Build everything so internal libs emit dist/** before the API compiles
RUN pnpm -r build

# Build the API (emits apps/api/dist/**)
RUN pnpm -C apps/api build

# --- Build the OpenAPI JSON once (uses build-time deps only) ---
# This tries common export shapes so we don't have to change your spec module.
RUN node -e "\
  const fs=require('fs');\
  const path=require('path');\
  const specMod=require('/app/apps/api/dist/openapi/spec.js');\
  const choose=(m)=> m.buildOpenAPIDocument?.() \
                 ?? m.buildOpenApiDocument?.() \
                 ?? m.buildOpenApi?.() \
                 ?? m.default?.() \
                 ?? m.openApiDocument \
                 ?? m.document; \
  const doc=choose(specMod); \
  if(!doc){ \
    console.error('Could not obtain OpenAPI document from dist/openapi/spec.js');\
    process.exit(2);\
  } \
  const out=path.join('/app/apps/api/dist','openapi.json');\
  fs.writeFileSync(out, JSON.stringify(doc,null,2));\
  console.log('Wrote', out);\
"

# Produce a clean runtime (only prod deps for the API)
# pnpm deploy syntax: pnpm --filter "<pkg>" deploy <target_dir> --prod
RUN mkdir -p /app/runtime && \
    pnpm --filter "@prism-apex/api" deploy /app/runtime --prod

# Bring compiled API output & runtime data into the runtime tree
RUN mkdir -p /app/runtime/apps/api/dist /app/runtime/apex && \
    cp -r /app/apps/api/dist/. /app/runtime/apps/api/dist/ && \
    cp -r /app/apex/.        /app/runtime/apex/

# ------------ Runtime stage ------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy the prepared runtime (node_modules + API dist + apex) as a unit
COPY --from=build /app/runtime/ /app/

EXPOSE 3000
CMD ["node", "/app/apps/api/dist/index.js"]
