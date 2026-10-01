#!/usr/bin/env bash
#
# deploy.sh — quick production (re)deploy for MBc360 (self-hosted, Docker).
#
# Run this ON THE PRODUCTION SERVER, from the repo root (e.g. ~/mbc360_app),
# where the untracked `.env` sits next to docker-compose.prod.yml.
# It mirrors docs/guides/DEPLOY.md §9 (redeploy) + §5 (migrate/seed) but automated:
#
#   1. git pull            (skip with --no-pull)
#   2. docker compose up -d --build  — this also MIGRATES: the compose file has
#      a one-shot `migrate` service (prisma migrate deploy) that the api waits
#      on with `service_completed_successfully`
#   3. seed rule config + role matrix        (only with --seed; first deploy)
#   4. health-check api + web
#
# Usage:
#   ./deploy.sh                 # pull, build, up (+migrate), health-check
#   ./deploy.sh --seed          # also run the (idempotent) seeder — first deploy
#   ./deploy.sh --no-pull       # deploy the working tree as-is (no git pull)
#   ./deploy.sh -h | --help
#
# There is deliberately NO --no-migrate: skipping migrations is how production
# ended up running new code against an old schema (every query touching a new
# column failing with Prisma P2022 "column does not exist" while the deploy
# itself reported success). Migrations are incremental and idempotent — a
# deploy with nothing new to apply costs a few seconds.
#
# The api image still ships only dist/ (no Prisma CLI); migrations run from the
# `migrate` build target of apps/api/Dockerfile, and the seeder — which also
# needs @mbc360/shared built and the Prisma client generated — still runs in a
# one-off node:22-alpine container, exactly as docs/guides/DEPLOY.md §5.

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
NODE_IMAGE="node:22-alpine"

DO_PULL=1
DO_SEED=0

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✓ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m  ✗ %s\033[0m\n' "$*" >&2; exit 1; }

for arg in "$@"; do
  case "$arg" in
    --no-pull)    DO_PULL=0 ;;
    --no-migrate) die "--no-migrate was removed: migrations now run as part of 'docker compose up' (see the header of this script)." ;;
    --seed)       DO_SEED=1 ;;
    -h|--help)    sed -n '2,37p' "$0"; exit 0 ;;
    *)            die "Unknown option: $arg (try --help)" ;;
  esac
done

# Always run from the directory this script lives in (the repo root).
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE not found — run this from the repo root on the server."
[ -f ".env" ] || die ".env not found next to $COMPOSE_FILE — copy .env.example to .env first (see docs/guides/DEPLOY.md §3)."
command -v docker >/dev/null 2>&1 || die "docker not found (or user not in the 'docker' group — see docs/guides/DEPLOY.md §2)."

dc() { docker compose -f "$COMPOSE_FILE" "$@"; }

# Read a host port from .env (plain values, no interpolation) with a default.
env_port() {
  local val
  val="$(grep -E "^$1=" .env 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d '\r[:space:]')"
  printf '%s' "${val:-$2}"
}
API_PORT="$(env_port API_HOST_PORT 3000)"
WEB_PORT="$(env_port WEB_HOST_PORT 8080)"

# ---------------------------------------------------------------------------
# 1. Pull latest code
# ---------------------------------------------------------------------------
if [ "$DO_PULL" -eq 1 ]; then
  log "Pulling latest code (git pull)"
  git pull --ff-only
  ok "Code updated"
else
  log "Skipping git pull (--no-pull) — deploying the working tree as-is"
fi

# ---------------------------------------------------------------------------
# 2. Build + start the stack
# ---------------------------------------------------------------------------
#
# `up` blocks on the one-shot `migrate` service: Postgres must report healthy,
# `prisma migrate deploy` must exit 0, and only then is the api started. If a
# migration fails the api is left on the OLD image rather than serving new code
# against an un-migrated schema — so surface the migrate log and stop here.
log "Building images and starting the stack (includes prisma migrate deploy)"
if ! dc up -d --build; then
  printf '\n\033[1;31m  ✗ Stack failed to come up. Last 50 lines of the migrate service:\033[0m\n' >&2
  dc logs --tail 50 migrate >&2 || true
  die "Deploy aborted — the database was not migrated, so the api was not restarted on the new image."
fi
ok "Containers up, migrations applied"

# ---------------------------------------------------------------------------
# 3. Optional seed via a one-off container on the compose network
# ---------------------------------------------------------------------------
if [ "$DO_SEED" -eq 1 ]; then
  log "Waiting for Postgres to be ready"
  for i in $(seq 1 30); do
    if dc exec -T postgres pg_isready -U mbc360 -d mbc360 >/dev/null 2>&1; then
      ok "Postgres ready"; break
    fi
    [ "$i" -eq 30 ] && die "Postgres did not become ready in time."
    sleep 2
  done

  # Reproduce the exact DATABASE_URL the api uses: read the real password from
  # the postgres container's env (avoids parsing/escaping .env — see the '$$'
  # trap in docs/guides/DEPLOY.md §3). Assumes a hex password (no URL-special chars),
  # which .env.example recommends.
  PGPASS="$(dc exec -T postgres printenv POSTGRES_PASSWORD | tr -d '\r\n')"
  [ -n "$PGPASS" ] || die "Could not read POSTGRES_PASSWORD from the postgres container."
  DB_URL="postgresql://mbc360:${PGPASS}@postgres:5432/mbc360"

  # The one-off container joins the SAME network the postgres container is on
  # (derived, not hardcoded — the compose project name follows the repo dir).
  NETWORK="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$(dc ps -q postgres)")"
  [ -n "$NETWORK" ] || die "Could not determine the compose network for postgres."
  ok "Using network: $NETWORK"

  log "Seeding rule config + role matrix (idempotent; SEED_DEMO_USERS=false)"
  docker run --rm --network "$NETWORK" \
    -v "$PWD":/repo -w /repo \
    -e DATABASE_URL="$DB_URL" \
    -e SEED_DEMO_USERS=false \
    "$NODE_IMAGE" sh -c "npm ci && npm run build -w @mbc360/shared && npm exec -w @mbc360/api -- prisma generate && npm run db:seed -w @mbc360/api"
  ok "Seed complete"
fi

# ---------------------------------------------------------------------------
# 4. Health checks
# ---------------------------------------------------------------------------
log "Health-checking the stack"
if curl -fsS "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1; then
  ok "API healthy (127.0.0.1:${API_PORT}/api/health)"
else
  die "API health check failed on 127.0.0.1:${API_PORT} — check: docker compose -f $COMPOSE_FILE logs api"
fi
if curl -fsSI "http://127.0.0.1:${WEB_PORT}" >/dev/null 2>&1; then
  ok "Web responding (127.0.0.1:${WEB_PORT})"
else
  die "Web check failed on 127.0.0.1:${WEB_PORT} — check: docker compose -f $COMPOSE_FILE logs web"
fi

log "Deploy complete."
printf '   Behind the host nginx at your configured domain (see deploy/nginx.mbcstaging.conf).\n'
printf '   Logs: docker compose -f %s logs -f api\n' "$COMPOSE_FILE"
