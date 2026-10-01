# Build context is the REPO ROOT (see docker-compose.prod.yml):
#   docker build -f apps/api/Dockerfile .
#
# Two publishable targets share one dependency layer:
#   --target runtime (default) -> the api server image (dist only, no Prisma CLI)
#   --target migrate           -> a one-shot image that runs `prisma migrate deploy`
# The `migrate` service in docker-compose.prod.yml builds the second one and the
# api waits for it to exit successfully, so a deploy can never start new code
# against an un-migrated database.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @mbc360/shared && npm run build -w @mbc360/api \
  && npm prune --omit=dev

# One-shot migration image. Branches off `deps` (before `npm prune`) because the
# Prisma CLI is a devDependency; carries only the schema, the migration history
# and prisma.config.ts (which supplies the datasource URL from DATABASE_URL —
# schema.prisma deliberately has none). Runs as root: the container is
# short-lived, exposes no port, and the TS config loader needs to write its
# cache into the root-owned node_modules.
FROM deps AS migrate
ENV CHECKPOINT_DISABLE=1
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY apps/api/prisma apps/api/prisma
CMD ["npm", "run", "db:deploy", "-w", "@mbc360/api"]

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# The @mbc360/shared entry in node_modules is a symlink to ../../packages/shared,
# so the package dir (package.json + dist) must be copied alongside node_modules.
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/api/dist/main.js"]
