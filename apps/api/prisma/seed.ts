// Database seeder (BACKEND_PLAN M1). Run with `npm run db:seed -w @mbc360/api`
// (or automatically after `prisma migrate dev` / `prisma migrate reset`).
//
// Seeds two kinds of data, both idempotent:
//   1. Rule configuration (principle 2 — data, not code): safety triggers (C1)
//      and the demo ingredient watch-lists (C3). When follow-ups F2/F3 are
//      answered these ROWS change, not the schema. gate_requirements stays
//      empty until F1 delivers the per-gate mandatory evidence/sign-off list.
//   2. One demo project scaffolded from the shared config via
//      createProjectWithScaffold — the server-side port of store/factory.ts.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  PB_CAUTION_GROUPS,
  PROHIBITED_GROUPS,
} from '@mbc360/shared/utils/ingredientWatch';
import { createProjectWithScaffold } from '../src/projects/project-scaffold';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set (see apps/api/.env.example)');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Skincare-for-Two triggers (rule C1). "Infant 0+" is added here if follow-up
// F2 is answered with yes — keep in sync with SKINCARE_FOR_TWO_TRIGGERS in
// packages/shared/src/utils/gateProgress.ts until M3 reads them from this table.
const SAFETY_TRIGGER_KEYWORDS = ['Pregnancy', 'Breastfeeding', 'Postpartum'];

async function seedSafetyTriggers(): Promise<void> {
  for (const keyword of SAFETY_TRIGGER_KEYWORDS) {
    await prisma.safetyTrigger.upsert({
      where: { keyword },
      update: {},
      create: { keyword },
    });
  }
  console.log(`Seeded ${SAFETY_TRIGGER_KEYWORDS.length} safety triggers`);
}

async function seedWatchlists(): Promise<void> {
  const existing = await prisma.watchlistEntry.count();
  if (existing > 0) {
    console.log(`Watchlist entries already present (${existing}) — skipped`);
    return;
  }
  await prisma.watchlistEntry.createMany({
    data: [
      ...PROHIBITED_GROUPS.map((g) => ({
        groupName: g.group,
        casNumbers: g.cas ?? [],
        inciKeywords: g.keywords,
        listType: 'prohibited',
      })),
      ...PB_CAUTION_GROUPS.map((g) => ({
        groupName: g.group,
        casNumbers: g.cas ?? [],
        inciKeywords: g.keywords,
        listType: 'pb_caution',
      })),
    ],
  });
  console.log(
    `Seeded ${PROHIBITED_GROUPS.length + PB_CAUTION_GROUPS.length} watchlist entries (demo stand-in until F3)`,
  );
}

async function seedCosmetriSyncState(): Promise<void> {
  await prisma.cosmetriSyncState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

async function seedDemoProject(): Promise<void> {
  const productCode = 'MBB-BALM-50';
  const existing = await prisma.project.findUnique({ where: { productCode } });
  if (existing) {
    console.log(`Demo project ${productCode} already present — skipped`);
    return;
  }
  await prisma.$transaction(async (tx) => {
    const { projectId } = await createProjectWithScaffold(tx, {
      productCode,
      projectLead: 'Anna Tran',
      productGroup: 'Mother & Baby Care',
      brandCustomer: 'Max Biocare',
      dateOpened: new Date('2026-03-02'),
      targetLaunchDate: new Date('2026-11-30'),
      productSku: 'Soothing Nipple & Baby Balm 50g',
      ownerDepartment: 'NPD',
      markets: ['Vietnam', 'Australia', 'Malaysia'],
    });
    await tx.auditEvent.create({
      data: {
        projectId,
        entityType: 'project',
        entityId: projectId,
        action: 'project.created',
        after: { productCode, source: 'seed' },
      },
    });
    console.log(`Seeded demo project ${productCode} (${projectId})`);
  });
}

async function main(): Promise<void> {
  await seedSafetyTriggers();
  await seedWatchlists();
  await seedCosmetriSyncState();
  await seedDemoProject();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
