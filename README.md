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

Images are built from the repo root (`apps/api/Dockerfile`, `apps/web/Dockerfile`) and orchestrated with `docker-compose.prod.yml`. The host nginx terminates TLS and routes `/` to the web container (127.0.0.1:8080) and `/api` to the api container (127.0.0.1:3000) — see `deploy/nginx.host.example.conf`. Secrets live in an untracked `.env` file.

## Documentation

- `docs/APP_PLAN.md` — source-of-truth spec (Vietnamese)
- `docs/Business_Rules_Confirmation_{EN,VN}.md` — confirmed business-rule decisions + open follow-ups (F1–F12)
- `docs/BACKEND_PLAN.md` — backend build plan (Vietnamese)
- `CLAUDE.md` — architecture guide for AI-assisted development
