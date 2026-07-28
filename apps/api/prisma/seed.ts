// Database seeder (BACKEND_PLAN M1). Run with `npm run db:seed -w @mbc360/api`.
// NOTE: Prisma 7's `migrate dev` / `migrate reset` do NOT invoke this
// automatically despite the `migrations.seed` entry in prisma.config.ts (found
// 2026-07-26 — a reset left a completely empty database). Always run the seed
// as its own step; `./reset-dev-data.sh` and `npm run db:setup` both do.
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
  SSO_ROLES,
  canApprovePhase,
  canDecideGate,
  canEditMarketTrack,
} from '@mbc360/shared/config/roles';
import { REVIEW_ROLES } from '@mbc360/shared/config/reviewers';
import { createProjectWithScaffold, type NewProjectReviewer } from '../src/projects/project-scaffold';

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
// short-circuits it. Permission-grant computation (below) is still demo-
// parity, awaiting F6's role×gate/phase grid.
//
// The `roles` table also now carries the F6-confirmed real role list
// (`SSO_ROLES`) — seeded AFTER `VIEW_ROLES` so its label wins for the shared
// `admin` key (ends up named "System Administrator", not the old demo "Admin
// (unrestricted)"). `SSO_ROLES` entries get zero permission grants below
// (same as any other role.key not found in VIEW_ROLES — `canDecideGate`/
// `canApprovePhase`/`canEditMarketTrack` simply don't recognise them yet),
// which is correct: the role×gate/phase mapping for these 17 roles is F6's
// still-open remainder, not yet answered.
async function seedRbac(): Promise<void> {
  // Only the 17 real assignable roles (F6). VIEW_ROLES — the old "View as" demo
  // keys — used to be seeded alongside them purely so a dev database that
  // already had `user_roles` rows against those keys kept working; nothing
  // reads VIEW_ROLES at runtime any more (the simulator, canDecideGate,
  // canApprovePhase and canEditMarketTrack all moved to SSO_ROLES). Dropped
  // here on 2026-07-26 together with a full database reset, which is exactly
  // the moment CLAUDE.md named as safe to remove them.
  for (const role of SSO_ROLES) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.label },
      create: { key: role.key, name: role.label },
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
    {
      // 2026-07-26, user-requested: "only Project Owner may archive a project".
      // A real capability (not a hard-coded role check) because archiving is
      // reversible and the Roles page is meant to be where this kind of
      // authority is adjusted. DELETING a project is deliberately NOT a
      // capability — see the isAdmin() check in ProjectsService.remove.
      resource: 'project',
      action: 'archive',
      description: 'Archive / restore a project (reversible; deleting is admin-only)',
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
    // Project Owner only, per the user's rule. Not derived from the keyword-match
    // token functions: this one authority WAS stated explicitly, so it is not a
    // guess awaiting F6 like the gate/phase grants around it.
    if (role.key === 'sso-project-owner') grantedIds.push(permissionId('project', 'archive'));

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

// One demo user per SSO role (2026-07-23, user-requested: re-seed demo users
// against the new F6 role list) so dev-login covers every real assignable
// role, not just the old VIEW_ROLES demo/"View as" keys. Independent Study
// Reviewer deliberately gets a DIFFERENT department than Study Author/
// Department Study Reviewer, so the C2 "Independent Reviewer must not share
// the Study Author's department" guard is actually exercisable against these
// demo accounts. Skip with SEED_DEMO_USERS=false (production).
const DEMO_USER_DEPARTMENTS: Record<string, string> = {
  [ADMIN_ROLE]: 'Management',
  'sso-project-owner': 'Project Office',
  'sso-formulation-contributor': 'NPD / R&I',
  'sso-safety-reviewer': 'Safety',
  'sso-quality-reviewer': 'Quality',
  'sso-regulatory-reviewer': 'Regulatory',
  'sso-packaging-artwork-contributor': 'Packaging',
  'sso-marketing-sales-contributor': 'Marketing & Sales',
  'sso-supply-chain-contributor': 'Supply Chain',
  'sso-manufacturing-link-contributor': 'Manufacturing',
  'sso-study-author': 'NPD / R&I',
  'sso-department-study-reviewer': 'NPD / R&I',
  'sso-independent-study-reviewer': 'Quality',
  'sso-published-info-technical-reviewer': 'Quality',
  'sso-published-info-regulatory-reviewer': 'Regulatory',
  'sso-final-approver': 'Management',
  'sso-read-only-viewer': 'Management',
};

async function seedDemoUsers(): Promise<void> {
  if (process.env.SEED_DEMO_USERS === 'false') {
    console.log('SEED_DEMO_USERS=false — demo users skipped');
    return;
  }
  // Previously-seeded VIEW_ROLES-keyed demo users (project-owner@demo...,
  // npd-ri@demo..., etc.) are left as-is, not deleted — this loop is purely
  // additive, matching the idempotent-seed convention used throughout this
  // file (never destructive).
  for (const ssoRole of SSO_ROLES) {
    // Keep the full key (incl. `sso-` prefix) as the email local-part rather
    // than stripping it — `sso-project-owner` would otherwise collide with
    // the pre-existing VIEW_ROLES demo user at `project-owner@demo...`,
    // silently merging two different roles onto one user instead of creating
    // a distinct account. `admin` is unprefixed either way, so it correctly
    // reuses the existing `admin@demo.mbc360.local` account (same role, same
    // person — that reuse IS intended).
    const email = `${ssoRole.key}@demo.mbc360.local`;
    const departmentName = DEMO_USER_DEPARTMENTS[ssoRole.key] ?? 'Management';
    const role = await prisma.role.findUnique({ where: { key: ssoRole.key } });
    if (!role) continue;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: `${ssoRole.label} (demo)`,
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
  console.log(`Seeded ${SSO_ROLES.length} demo users (…@demo.mbc360.local, one per SSO role)`);
}

// The 13 review areas each have a named owner in the source workbook (encoded
// as the tab-name prefix: Tuan-, George-, ChiChu-, ...). Seeding them as real
// User rows is what makes the reviewer assignment DYNAMIC rather than a
// hardcoded name: the Create New Project form's user pickers list active users
// from GET /api/rbac/users, so these people become selectable there, and the
// demo project below is assigned from these rows instead of a config constant.
// REVIEW_ROLES[].defaultName stays in config only as the form placeholder.
//
// Departments reuse the existing demo department names where one fits, so this
// does not sprawl a new Department row per person.
//
// Each also gets ONE assignable SSO role (2026-07-26, user-requested — they were
// initially left role-less because the F6 role x review-area matrix is still
// open). This mapping is DERIVED, not SME-confirmed: 9 of the 13 match an SSO
// role label almost literally, and 4 are a judgement call marked below. Change
// these rows when F6 answers — it is seed data, not logic. The app enforces one
// role per user (see admin-users.controller.ts), so each area gets exactly one
// even where the person wears two hats in the workbook (e.g. George is both R&I
// evidence owner and the C2 Department Study Reviewer — that second authority
// comes from the dedicated study-approval workflow, not from this role).
const REVIEW_OWNER_ROLES: Record<string, string> = {
  'project-manager': 'sso-project-owner',
  formulation: 'sso-formulation-contributor',
  ri: 'sso-formulation-contributor', // the SSO label is literally "R&I/Formulation Contributor"
  quality: 'sso-quality-reviewer',
  'quality-gmp': 'sso-quality-reviewer', // GMP is a Quality hat; no separate GMP role exists
  regulatory: 'sso-regulatory-reviewer',
  // --- judgement calls (no close SSO label): revisit when F6 answers ---
  'raw-material': 'sso-supply-chain-contributor', // Raw Material Ops ~ procurement/supply
  'facility-pm': 'sso-manufacturing-link-contributor', // Facility / PM Operations ~ manufacturing link
  'hr-quality': 'sso-quality-reviewer', // HR/Quality co-signs Quality areas
  // Digital / Platforms only CO-REVIEWS one register (Released Label Control) and
  // holds no gate-decision authority in the workbook, so Read-only Viewer —
  // which carries no decide/approve grants — matches the actual authority
  // better than inventing one. NOT "admin": administering the platform is a
  // different thing from having business decision rights.
  'digital-platforms': 'sso-read-only-viewer',
  // --- back to literal matches ---
  packaging: 'sso-packaging-artwork-contributor',
  'sales-marketing': 'sso-marketing-sales-contributor',
  'supply-chain': 'sso-supply-chain-contributor',
};

const REVIEW_OWNER_DEPARTMENTS: Record<string, string> = {
  'project-manager': 'Project Office',
  formulation: 'NPD / R&I',
  ri: 'NPD / R&I',
  quality: 'Quality',
  'quality-gmp': 'Quality',
  regulatory: 'Regulatory',
  'raw-material': 'Supply Chain',
  packaging: 'Packaging',
  'sales-marketing': 'Marketing & Sales',
  'supply-chain': 'Supply Chain',
  'facility-pm': 'Facility / PM Operations',
  'hr-quality': 'Quality',
  'digital-platforms': 'Digital / Platforms',
};

function reviewOwnerEmail(name: string): string {
  const local = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${local}@demo.mbc360.local`;
}

// Returns roleKey -> { userId, name } for the seeded review owners.
async function seedReviewOwnerUsers(): Promise<NewProjectReviewer[]> {
  if (process.env.SEED_DEMO_USERS === 'false') {
    console.log('SEED_DEMO_USERS=false — review-owner users skipped');
    return [];
  }
  const assigned: NewProjectReviewer[] = [];
  for (const role of REVIEW_ROLES) {
    const email = reviewOwnerEmail(role.defaultName);
    const departmentName = REVIEW_OWNER_DEPARTMENTS[role.key] ?? 'Management';
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: role.defaultName,
        department: {
          connectOrCreate: { where: { name: departmentName }, create: { name: departmentName } },
        },
      },
    });

    const roleKey = REVIEW_OWNER_ROLES[role.key];
    const dbRole = roleKey ? await prisma.role.findUnique({ where: { key: roleKey } }) : null;
    if (dbRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: dbRole.id } },
        update: {},
        create: { userId: user.id, roleId: dbRole.id },
      });
    } else if (roleKey) {
      console.warn(`  ! review owner ${role.defaultName}: role "${roleKey}" not found — left without a role`);
    }

    assigned.push({ roleKey: role.key, userId: user.id, name: user.displayName });
  }
  console.log(
    `Seeded ${assigned.length} review-owner users with roles (${assigned.map((a) => a.name).join(', ')})`,
  );
  return assigned;
}

async function seedDemoProject(reviewers: NewProjectReviewer[]): Promise<void> {
  const productCode = 'MBB-BALM-50';
  const existing = await prisma.project.findUnique({ where: { productCode } });
  if (existing) {
    // Additive backfill rather than a plain skip: the demo project predates the
    // project_reviewers table (2026-07-26), so an already-seeded database would
    // otherwise keep a project with no review owners forever. Upsert per role
    // so re-running never duplicates and never overwrites a real reassignment.
    let added = 0;
    for (const r of reviewers) {
      const result = await prisma.projectReviewer.upsert({
        where: { projectId_roleKey: { projectId: existing.id, roleKey: r.roleKey } },
        update: {},
        create: {
          projectId: existing.id,
          roleKey: r.roleKey,
          userId: r.userId,
          name: r.name,
        },
      });
      if (result.assignedAt.getTime() > Date.now() - 5000) added++;
    }
    console.log(
      `Demo project ${productCode} already present — scaffold skipped, ${added} review owner(s) backfilled`,
    );
    return;
  }
  await prisma.$transaction(async (tx) => {
    const { projectId } = await createProjectWithScaffold(tx, {
      // Same id the frontend demo used, so a fresh database lines up with the
      // human project code shown in the UI instead of an opaque cuid.
      id: 'MBC-2026-001',
      productCode,
      // Temporary placeholder (user-requested): Chris (Project Manager) until
      // a real project lead is assigned — was a free-text 'Anna Tran' before
      // projectLead became a user-picker sourced from the same active-user
      // list as the review owners.
      projectLead: 'Chris',
      productGroup: 'Mother & Baby Care',
      brandCustomer: 'Max Biocare',
      dateOpened: new Date('2026-03-02'),
      targetLaunchDate: new Date('2026-11-30'),
      productSku: 'Soothing Nipple & Baby Balm 50g',
      ownerDepartment: 'NPD',
      markets: ['Vietnam', 'Australia', 'Malaysia'],
      reviewers,
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
  const reviewers = await seedReviewOwnerUsers();
  await seedDemoProject(reviewers);
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
