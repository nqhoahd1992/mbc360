// run.ts — end-to-end check of gate signing and the SW-4 / SW-5 freeze rules over real HTTP.
//
//   npm run build            # the run uses the BUILT api and shared packages
//   npm run verify:e2e
//
// What it does, all of it disposable:
//   1. creates a scratch database `mbc360_e2e` on the Postgres DATABASE_URL points at, migrates and
//      seeds it — refusing to run unless that Postgres is on localhost;
//   2. starts the built API on port 3199 (never the dev server's 3000) against that database;
//   3. runs gate-signing.e2e.ts: real sessions, real authenticator enrolment and step-up, three real
//      signatures per gate, then edits through the API;
//   4. stops ITS OWN API process and drops the scratch database, whatever the outcome.
//
// It never touches the development database and never stops anything it did not start.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { run } from './gate-signing.e2e';

const ROOT = resolve(__dirname, '..', '..', '..', '..');
const API = join(ROOT, 'apps', 'api');
const PORT = 3199;
const DB_NAME = 'mbc360_e2e';

dotenv.config({ path: join(API, '.env') });

function die(message: string): never {
  console.error(`verify:e2e: ${message}`);
  process.exit(2);
}

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) die('DATABASE_URL is not set (apps/api/.env).');
const url = new URL(baseUrl);
if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
  die(`DATABASE_URL points at "${url.hostname}", not localhost. This script creates and drops a database; it only runs against a local Postgres.`);
}
for (const file of ['apps/api/dist/main.js', 'packages/shared/dist/config/gateReadiness.js']) {
  if (!existsSync(join(ROOT, file))) die(`${file} is missing — run \`npm run build\` first.`);
}

const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';
const scratchUrl = new URL(baseUrl);
scratchUrl.pathname = `/${DB_NAME}`;

async function withAdmin<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

function runStep(label: string, command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', shell: true });
  if (result.status !== 0) {
    console.error(result.stdout?.slice(-1500) ?? '');
    console.error(result.stderr?.slice(-1500) ?? '');
    throw new Error(`${label} failed (exit ${result.status})`);
  }
}

async function waitForApi(): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('the API did not come up within 60 seconds');
}

function stop(child: ChildProcess | undefined): void {
  if (!child?.pid) return;
  // Only the process this script started, and its children.
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: true });
  else child.kill('SIGTERM');
}

async function main(): Promise<number> {
  try {
    const res = await fetch(`http://localhost:${PORT}/api/health`);
    if (res.ok) die(`something is already listening on port ${PORT}; stop it or free the port.`);
  } catch {
    /* free, as expected */
  }

  let child: ChildProcess | undefined;
  let failures = 1;
  try {
    console.log(`Creating scratch database ${DB_NAME}…`);
    await withAdmin(async (c) => {
      await c.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
      await c.query(`CREATE DATABASE ${DB_NAME}`);
    });
    const env = { ...process.env, DATABASE_URL: scratchUrl.toString() };
    console.log('Migrating and seeding…');
    runStep('prisma migrate deploy', 'npx', ['prisma', 'migrate', 'deploy'], API, env);
    runStep('seed', 'npx', ['tsx', 'prisma/seed.ts'], API, env);

    console.log(`Starting the API on port ${PORT}…`);
    child = spawn('node', [join(__dirname, 'harness.js')], {
      cwd: API,
      env: {
        ...env,
        PORT: String(PORT),
        NODE_ENV: 'development',
        SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret',
        PINNED_ADMINS: 'app.admin@maxbiocare.com',
      },
      stdio: 'ignore',
    });
    await waitForApi();

    const db = new Client({ connectionString: scratchUrl.toString() });
    await db.connect();
    try {
      failures = await run(`http://localhost:${PORT}/api`, db);
    } finally {
      await db.end();
    }
  } catch (error) {
    console.error(`verify:e2e aborted: ${(error as Error).message}`);
    failures = 2;
  } finally {
    stop(child);
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await withAdmin((c) => c.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`));
    } catch (error) {
      console.error(`could not drop ${DB_NAME}: ${(error as Error).message}`);
    }
  }
  return failures;
}

main().then((code) => process.exit(code));
