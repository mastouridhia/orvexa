# syntax=docker/dockerfile:1.7
# Build context: monorepo root (so workspace deps resolve).
#   docker build -f apps/api/Dockerfile -t orvexa-api .
#
# Debian-slim base (not alpine): sharp ships prebuilt binaries against glibc,
# and the alpine prebuilds + libvips story is fragile (frequent source-build
# fallbacks). The size delta vs alpine is ~20-30MB and not worth the toil.

ARG NODE_VERSION=22-bookworm-slim

# ── Build ───────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS build
WORKDIR /app

# All workspace manifests so npm ci can resolve the full graph in one shot.
# (Filtering with --workspace drops dev deps in CI mode and makes tsc disappear.)
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY apps/customer/package.json apps/customer/
COPY apps/kitchen/package.json apps/kitchen/
COPY apps/waiter/package.json apps/waiter/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY packages/api-client/package.json packages/api-client/

# npm ci is strict to the lockfile, which was generated on Windows and is
# missing linux-x64 native binaries (sharp). Use `npm install` so npm resolves
# the correct platform-specific optional deps for the current build environment.
RUN npm install --no-audit --no-fund

# Source for the api dep graph only — frontend sources stay out of the image.
COPY packages/shared packages/shared
COPY apps/api apps/api

# Build shared first (api imports its compiled output), then api.
RUN npm run build --workspace @orvexa/shared \
 && npm run build --workspace @orvexa/api

# Drop dev deps from the final node_modules tree.
RUN npm prune --omit=dev

# ── Runtime ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

# Runtime deps: tini for clean signal handling, curl for healthchecks. sharp's
# prebuilt binary already bundles libvips so no extra system packages needed.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -g 1001 -r orvexa \
 && useradd  -u 1001 -r -g orvexa -s /sbin/nologin orvexa

ENV NODE_ENV=production \
    PORT=4000 \
    UPLOADS_DIR=/var/lib/orvexa/uploads

# Copy hoisted node_modules + workspace packages + api dist (and drizzle migrations).
COPY --from=build --chown=orvexa:orvexa /app/node_modules ./node_modules
COPY --from=build --chown=orvexa:orvexa /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=orvexa:orvexa /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=orvexa:orvexa /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=orvexa:orvexa /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=orvexa:orvexa /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build --chown=orvexa:orvexa /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=orvexa:orvexa /app/package.json ./package.json

# Persistent volume for user-uploaded dish images.
RUN mkdir -p "$UPLOADS_DIR" && chown -R orvexa:orvexa "$UPLOADS_DIR"
VOLUME ["/var/lib/orvexa/uploads"]

USER orvexa
WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/health || exit 1

# tini reaps zombies + forwards SIGTERM to node, so graceful shutdown actually fires.
ENTRYPOINT ["/usr/bin/tini", "--"]
# Run migrations on every start (drizzle-migrator is idempotent), then boot.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
