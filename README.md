# MBc360

Product Development & Quality "Phase-Gate" system (4 phases / 12 gates), modeled on the MBc360 Master Product Development System workbook.

## Repository layout (npm workspaces monorepo)

| Path | Package | What it is |
|---|---|---|
| `apps/web` | `@mbc360/web` | React + Vite frontend (originally the demo UI) |
| `apps/api` | `@mbc360/api` | NestJS backend API |
| `packages/shared` | `@mbc360/shared` | Canonical types, workbook-derived config, and the phase-gate rule engine — the single rule source used by both web and api |

## Development

Apps run natively in dev (hot reload); only infrastructure runs in Docker.

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres
npm install
npm run dev        # shared (tsc watch) + api (nest watch, :3000) + web (vite HMR, :5173)
```

The Vite dev server proxies `/api` to `localhost:3000`, mirroring the production nginx routing.

Other commands:

```bash
npm run build      # build shared -> api -> web
npm run lint       # oxlint across the whole repo
```

## Production (self-hosted, Docker)

Images are built from the repo root (`apps/api/Dockerfile`, `apps/web/Dockerfile`) and orchestrated with `docker-compose.prod.yml`. The host nginx terminates TLS and routes `/` to the web container and `/api` to the api container (host ports default to 8080/3000, overridable via `WEB_HOST_PORT`/`API_HOST_PORT`). Secrets live in an untracked `.env` next to the compose file — start from `.env.example` at the repo root.

Step-by-step deploy guide (Vietnamese, includes migrate/seed and the host nginx + certbot setup): `docs/DEPLOY.md`. Nginx server blocks: `deploy/nginx.host.example.conf` (generic single-tenant example) and `deploy/nginx.mbcstaging.conf` (the real block for the shared mbcstaging.com VPS, ports 8086/3004).

## Documentation

- `docs/APP_PLAN.md` — source-of-truth spec (Vietnamese)
- `docs/Business_Rules_Confirmation_{EN,VN}.md` — confirmed business-rule decisions + open follow-ups (F1–F12)
- `docs/BACKEND_PLAN.md` — backend build plan (Vietnamese)
- `docs/DEPLOY.md` — production deploy guide (Vietnamese)
- `CLAUDE.md` — architecture guide for AI-assisted development
