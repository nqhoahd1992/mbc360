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
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import {
  ADMIN_ROLE,
  VIEW_ROLES,
  canApprovePhase,
  canDecideGate,
  canEditMarketTrack,
} from '@mbc360/shared/config/roles';
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

// Demo-parity RBAC seed (BACKEND_PLAN 4.1 / M2): materialise the keyword-match
// mapping from @mbc360/shared/config/roles into roles / permissions /
// role_permissions rows. The admin role gets NO rows — PermissionsService
// short-circuits it. Replaced by the real matrix when F6 is answered.
async function seedRbac(): Promise<void> {
  for (const viewRole of VIEW_ROLES) {
    await prisma.role.upsert({
      where: { key: viewRole.key },
      update: { name: viewRole.label },
      create: { key: viewRole.key, name: viewRole.label },
    });
  }

  const permissionDefs: { resource: string; action: string; description: string }[] = [
    ...GATES.map((g) => ({
      resource: `gate:${g.id}`,
      action: 'decide',
      description: `Record the ${g.id} gate decision (primary owner: ${g.primaryOwner})`,
    })),
    ...PHASES.map((p) => ({
      resource: `phase:${p.phase}`,
      action: 'approve',
      description: `Sign the Phase ${p.phase} "Approved by" row (department: ${p.department})`,
    })),
    {
      resource: 'market-track',
      action: 'approve',
      description: 'Approve market PIF / regulatory / claims / launch statuses (A1/C5)',
    },
  ];
  for (const def of permissionDefs) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: def.resource, action: def.action } },
      update: { description: def.description },
      create: def,
    });
  }

  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();
  const permissionId = (resource: string, action: string) =>
    permissions.find((p) => p.resource === resource && p.action === action)!.id;

  let grants = 0;
  for (const role of roles) {
    if (role.key === ADMIN_ROLE) continue; // admin short-circuits in PermissionsService
    const grantedIds: string[] = [];
    for (const gate of GATES) {
      if (canDecideGate(role.key, gate.id)) grantedIds.push(permissionId(`gate:${gate.id}`, 'decide'));
    }
    for (const phase of PHASES) {
      if (canApprovePhase(role.key, phase.phase)) grantedIds.push(permissionId(`phase:${phase.phase}`, 'approve'));
    }
    if (canEditMarketTrack(role.key)) grantedIds.push(permissionId('market-track', 'approve'));

    for (const pid of grantedIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: pid } },
        update: {},
        create: { roleId: role.id, permissionId: pid },
      });
    }
    grants += grantedIds.length;
  }
  console.log(`Seeded ${roles.length} roles, ${permissionDefs.length} permissions, ${grants} grants (demo-parity, awaiting F6)`);
}

// One demo user per role so dev-login works before the Entra app registration
// exists. Skip with SEED_DEMO_USERS=false (production).
const DEMO_USER_DEPARTMENTS: Record<string, string> = {
  [ADMIN_ROLE]: 'Management',
  'project-owner': 'Project Office',
  'marketing-sales': 'Marketing & Sales',
  'npd-ri': 'NPD / R&I',
  procurement: 'Procurement',
  packaging: 'Packaging',
  manufacturing: 'Manufacturing',
  quality: 'Quality',
  safety: 'Safety',
  regulatory: 'Regulatory',
};

async function seedDemoUsers(): Promise<void> {
  if (process.env.SEED_DEMO_USERS === 'false') {
    console.log('SEED_DEMO_USERS=false — demo users skipped');
    return;
  }
  for (const viewRole of VIEW_ROLES) {
    const email = `${viewRole.key}@demo.mbc360.local`;
    const departmentName = DEMO_USER_DEPARTMENTS[viewRole.key] ?? 'Management';
    const role = await prisma.role.findUnique({ where: { key: viewRole.key } });
    if (!role) continue;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: `${viewRole.label} (demo)`,
        department: {
          connectOrCreate: { where: { name: departmentName }, create: { name: departmentName } },
        },
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }
  console.log(`Seeded ${VIEW_ROLES.length} demo users (…@demo.mbc360.local, one per role)`);
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
  await seedRbac();
  await seedDemoUsers();
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
