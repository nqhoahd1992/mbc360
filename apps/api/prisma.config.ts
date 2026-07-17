// Prisma 7 CLI configuration. The CLI no longer auto-loads .env, so load it
// here explicitly (development values live in apps/api/.env, never committed).
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Fallback keeps `prisma generate` working where no database exists
    // (CI, Docker image build — .env is dockerignored). Commands that actually
    // connect (migrate, seed, studio) fail against the placeholder host.
    url: process.env.DATABASE_URL ?? 'postgresql://unset:unset@database-url-not-set:5432/unset',
  },
});
