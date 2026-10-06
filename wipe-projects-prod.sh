#!/usr/bin/env bash
#
# wipe-projects-prod.sh — delete EVERY project (and its data + audit trail) on
# the production database. Run ON THE PRODUCTION SERVER from the repo root.
#
# Why a separate script: apps/api/scripts/wipe-projects.ts is not in any
# production image (the runtime image ships dist/ only, with no tsx). Like the
# seeder in deploy.sh, it runs from a one-off node:22-alpine container that
# mounts the repo and joins the compose network. Nothing is added to the images,
# so nobody can trigger a wipe from inside the running api container.
#
# Usage:
#   ./wipe-projects-prod.sh --dry-run    # list what would go, change nothing (do this first)
#   ./wipe-projects-prod.sh              # list, then require typing "DELETE ALL PROJECTS"
#
# Kept: users, roles, permissions, company reference data, rule config, Cosmetri
# connection. Take a backup first if there is anything you might want back:
#   docker compose -f docker-compose.prod.yml exec -T postgres \
#     pg_dump -U mbc360 mbc360 > backup-$(date +%F).sql
#
# --yes is deliberately NOT accepted here: on production the typed confirmation
# is the point.

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
NODE_IMAGE="node:22-alpine"

die() { printf '\033[1;31m  ✗ %s\033[0m\n' "$*" >&2; exit 1; }

for arg in "$@"; do
  case "$arg" in
    --dry-run)  ;;
    --yes)      die "--yes is not accepted on production; type the confirmation phrase instead." ;;
    -h|--help)  sed -n '2,20p' "$0"; exit 0 ;;
    *)          die "Unknown option: $arg (try --help)" ;;
  esac
done

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE not found — run this from the repo root on the server."
command -v docker >/dev/null 2>&1 || die "docker not found (or user not in the 'docker' group)."

dc() { docker compose -f "$COMPOSE_FILE" "$@"; }

dc exec -T postgres pg_isready -U mbc360 -d mbc360 >/dev/null 2>&1 || die "Postgres is not running/ready."

# Same DATABASE_URL derivation as deploy.sh's seed step.
PGPASS="$(dc exec -T postgres printenv POSTGRES_PASSWORD | tr -d '\r\n')"
[ -n "$PGPASS" ] || die "Could not read POSTGRES_PASSWORD from the postgres container."
DB_URL="postgresql://mbc360:${PGPASS}@postgres:5432/mbc360"

NETWORK="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$(dc ps -q postgres)")"
[ -n "$NETWORK" ] || die "Could not determine the compose network for postgres."

# -it: the script prompts for the confirmation phrase, so it needs a terminal.
# --allow-remote: the host is "postgres", not localhost; this is the deliberate override.
docker run --rm -it --network "$NETWORK" \
  -v "$PWD":/repo -w /repo \
  -e DATABASE_URL="$DB_URL" \
  "$NODE_IMAGE" sh -c "npm ci && npm run build -w @mbc360/shared && npm exec -w @mbc360/api -- prisma generate && npm run db:wipe-projects -w @mbc360/api -- --allow-remote $*"
