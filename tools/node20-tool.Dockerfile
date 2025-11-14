# tools/node20-tool.Dockerfile
#
# Canonical Node 20 + pnpm tool image for Prism-Apex.
# Used for:
#   - pnpm install (lockfile-aligned)
#   - running vitest / lint / typecheck
#
# This image deliberately does NOT bake node_modules into the image.
# node_modules live on the host and are bind-mounted into /app.

FROM node:20.19.5

# Set a fixed working directory
WORKDIR /app

# Install a pinned pnpm version globally.
# This avoids corepack prompts and keeps behaviour deterministic.
RUN npm install -g pnpm@9.0.0

# Default command: interactive shell (most callers will override with pnpm ...)
CMD ["bash"]
