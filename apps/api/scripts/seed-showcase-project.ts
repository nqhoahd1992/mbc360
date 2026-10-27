// seed-showcase-project.ts — DEV TOOL: one project to SHOW the app with. Data in every part of it, all 12 gates genuinely passed
// (readiness met, closing signatures, gate signatures, every phase signed off), and three formula versions
// made through the real route — F1.0, F1.1 (Minor) and F2.0 (Major, which reopened Gates 4-9 and is recorded as a backtrack, so those
// gates were passed a second time).
//
//   npm run db:seed-showcase-project
//   npm run db:seed-showcase-project -- --name "Soothing balm 50g"
//
// It is the other two seeders run in the order that makes this possible, because each locks what it passes:
//   1. db:seed-full-project --stage data       every register, phase page, both BOMs, costing, evidence, markets, CAPA, feedback
//   2. db:seed-gate-project --gate 4           passes Gates 1-4 and completes Phase 1 (the one bypass: signatures are written to the DB)
//   3. db:seed-full-project --stage versions   F1.1 and F2.0 through POST /formula-versions (needs Gate 05 to be the open gate)
//   4. db:seed-gate-project --gate 12          the Major version reopened Gates 04-09: pass them again, then Gates 5-12 (per market at 10-12)
//   5. db:seed-full-project --stage finish     gate flow records for the open and later gates, and change control records
//
// Needs the API running (`npm run dev`, or API_URL=...) and apps/api/.env. Refuses a non-localhost database (see the two scripts).
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const id = flag('id') ?? `SEED-SHOWCASE-${Date.now().toString(36).toUpperCase()}`;
const name = flag('name') ?? 'Showcase project';
const passThrough = argv.includes('--allow-remote') ? ['--allow-remote'] : [];

function run(label: string, script: string, args: string[]): void {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync('npx', ['tsx', `scripts/${script}`, ...args, ...passThrough], { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\n✖ Step "${label}" failed (exit ${result.status}). The project ${id} was created and filled as far as it got.`);
    process.exit(result.status ?? 1);
  }
}

run('1/5 data in every part of the app', 'seed-full-project.ts', ['--stage', 'data', '--id', id, '--name', name]);
run('2/5 Gates 1-4 passed, Phase 1 signed off', 'seed-gate-project.ts', ['--gate', '4', '--project', id]);
run('3/5 formula versions F1.1 and F2.0', 'seed-full-project.ts', ['--stage', 'versions', '--id', id]);
run('4/5 Gates 4-12 passed (4 again after the Major version)', 'seed-gate-project.ts', ['--gate', '12', '--project', id]);
run('5/5 gate records and change control', 'seed-full-project.ts', ['--stage', 'finish', '--id', id, '--passed', '12']);

console.log(`\n✔ Showcase project ready. Open it at  /#/projects/${id}`);
