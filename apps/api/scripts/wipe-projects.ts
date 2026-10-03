// wipe-projects.ts — delete EVERY project and everything that belongs to it.
//
//   npm run db:wipe-projects                 # show what would go, then ask
//   npm run db:wipe-projects -- --dry-run    # show what would go, change nothing
//   npm run db:wipe-projects -- --yes        # no prompt (scripted use)
//   npm run db:wipe-projects -- --allow-remote   # permit a non-localhost DATABASE_URL
//
// Deleted:
//   - every row of `projects`, and through `onDelete: Cascade` everything that
//     hangs off one: gates, checklists, requirements, gate checks, phase closures
//     and phase sign-offs, gate sign-offs, registers and register closures,
//     evidence, BOM, packaging BOM, costing, formula versions, next actions,
//     market tracks, study approvals, CAPA, feedback, post-launch reviews,
//     supersession decisions, attachments, reviewers, markets, and the project's
//     own audit trail;
//   - `change_records` linked to a project — the one project relation WITHOUT a
//     cascade (Prisma's default SetNull), which would otherwise survive as
//     orphans with no project;
//   - `idempotency_keys` for project actions (`project.*`), whose stored
//     responses describe projects that no longer exist.
//
// Kept: users, roles and the permission grid, company reference data (market
// profiles, raw material risk overlay, Claims Library), rule config, the
// Cosmetri connection, and every audit row that is not about a project.
//
// One TOMBSTONE audit row per project is written first, deliberately WITHOUT a
// projectId so the cascade cannot erase it — the same rule DELETE /projects/:id
// follows (B4, "no silent corrections"): a project must never vanish leaving no
// record that it existed or how it was removed.
//
// Everything runs in ONE transaction: either every project goes, or none does.
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const ASSUME_YES = args.has('--yes');
const ALLOW_REMOTE = args.has('--allow-remote');
const CONFIRM_PHRASE = 'DELETE ALL PROJECTS';

function die(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) die('DATABASE_URL is not set (run from apps/api, or set it in apps/api/.env).');

const host = (() => {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return die('DATABASE_URL is not a valid URL.');
  }
})();
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
if (!isLocal && !ALLOW_REMOTE) {
  die(`DATABASE_URL points at "${host}", not localhost. Pass --allow-remote if you really mean that database.`);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, productCode: true, productSku: true, projectLead: true, archivedAt: true },
    orderBy: { id: 'asc' },
  });
  const ids = projects.map((p) => p.id);
  const [auditRows, changeRecords, registerRows, idempotencyKeys] = await Promise.all([
    prisma.auditEvent.count({ where: { projectId: { in: ids } } }),
    prisma.changeRecord.count({ where: { projectId: { in: ids } } }),
    prisma.registerRow.count({ where: { projectId: { in: ids } } }),
    prisma.idempotencyKey.count({ where: { scope: { startsWith: 'project.' } } }),
  ]);

  console.log(`\nDatabase: ${host}${isLocal ? '' : '  ⚠ REMOTE'}`);
  if (projects.length === 0) {
    console.log('No projects — nothing to delete.\n');
    return;
  }
  console.log(`\nProjects to delete (${projects.length}):`);
  for (const p of projects) {
    console.log(`  ${p.id.padEnd(16)} ${p.productSku}${p.archivedAt ? '  (archived)' : ''}`);
  }
  console.log('\nAlso removed with them:');
  console.log(`  ${registerRows} register rows, ${auditRows} project audit events,`);
  console.log(`  ${changeRecords} change records, ${idempotencyKeys} project idempotency keys`);
  console.log('  …and every other table that belongs to a project.');
  console.log('\nKept: users, roles, permissions, company reference data, rule config, Cosmetri connection.');

  if (DRY_RUN) {
    console.log('\n--dry-run: nothing was changed.\n');
    return;
  }

  if (!ASSUME_YES) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`\nThis cannot be undone. Type "${CONFIRM_PHRASE}" to continue: `);
    rl.close();
    if (answer.trim() !== CONFIRM_PHRASE) die('Not confirmed — nothing was changed.');
  }

  await prisma.$transaction(
    async (tx) => {
      // Tombstones first, without projectId, so the cascade below keeps them.
      await tx.auditEvent.createMany({
        data: projects.map((p) => ({
          actorId: null,
          entityType: 'project',
          entityId: p.id,
          action: 'project.deleted',
          before: {
            id: p.id,
            productCode: p.productCode,
            productSku: p.productSku,
            projectLead: p.projectLead,
            wasArchived: !!p.archivedAt,
            via: 'apps/api/scripts/wipe-projects.ts (bulk wipe of every project)',
          },
        })),
      });
      await tx.changeRecord.deleteMany({ where: { projectId: { in: ids } } });
      await tx.idempotencyKey.deleteMany({ where: { scope: { startsWith: 'project.' } } });
      await tx.project.deleteMany({ where: { id: { in: ids } } });
    },
    { timeout: 120_000 },
  );

  const left = await prisma.project.count();
  if (left !== 0) die(`${left} project(s) still present after the wipe.`);
  console.log(`\n✔ Deleted ${projects.length} project(s). ${projects.length} tombstone audit row(s) written.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
