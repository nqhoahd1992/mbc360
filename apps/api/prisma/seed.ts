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
import { REFERENCE_DATASETS } from '@mbc360/shared/config/referenceData';
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
    // Round 4 question 32(c) (2026-08-24). Recording Proceed with Conditions may
    // serve as the authorised acceptance of a flagged watch-list finding — "a
    // separate duplicate acknowledgement is not required" — but only where "the
    // gate approver has the required Safety or Regulatory authority". Two
    // capabilities rather than one, because the answer names the two functions
    // separately and a finding escalated to Safety is not the same thing as one
    // escalated to Regulatory.
    {
      resource: 'watchlist-finding',
      action: 'accept-safety',
      description: 'Carry a Safety-escalated watch-list finding under Proceed with Conditions (Round 4, q32c)',
    },
    {
      resource: 'watchlist-finding',
      action: 'accept-regulatory',
      description: 'Carry a Regulatory-escalated watch-list finding under Proceed with Conditions (Round 4, q32c)',
    },
    // Round 4 question 34(d): the existing Gate 11 open-change acknowledgement
    // "may be reused if role-restricted… Only a person authorised to approve the
    // relevant Gate 11 impact may acknowledge it."
    {
      resource: 'change-impact',
      action: 'acknowledge',
      description: 'Acknowledge an open change control at Gate 11 (Round 4, q34d)',
    },
    // The Formulation Change Register's commercial approval, which the workbook
    // calls "NP sign-off" and held as a free-text name box until 2026-08-26. It
    // is a capability rather than a separate register because authority is not a
    // table: the app has role grants, an authenticated signature and gate
    // readiness, none of which a spreadsheet had. Whether that register should
    // exist at all is [ASSUMPTION: R5-Q18].
    {
      resource: 'formulation-change',
      action: 'approve-commercial',
      description: 'Sign the commercial (NP) approval on a formulation change',
    },
    // Company-level reference data (Round 4 questions 4, 17, 28). One capability
    // per dataset, not one for "reference data": the answers name different
    // authorities — Regulatory for market profiles, Technical/Safety/Regulatory for
    // the risk overlay, Technical AND Regulatory for the Claims Library — so
    // collapsing them into one grant would hand each dataset to everyone who can
    // edit any of them.
    ...REFERENCE_DATASETS.map((dataset) => ({
      resource: `reference:${dataset}`,
      action: 'edit',
      description: `Maintain the company-level ${dataset} reference data (Round 4)`,
    })),
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

    // Round 4 questions 32(c) and 34(d). Seeded to the roles whose names ARE the
    // functions the answers name — Safety/Scientific Review and Regulatory for a
    // watch-list finding, and the Gate 11 release authorities for the change
    // acknowledgement. Not derived from the keyword-match token functions above,
    // because these authorities are stated in the answers rather than inferred.
    //
    // Like every other grant here this is an editable STARTING POINT, not logic:
    // the Role Editor is where it gets adjusted, and F6's confirmed role x gate
    // matrix is still open.
    if (role.key === 'sso-safety-reviewer') {
      grantedIds.push(permissionId('watchlist-finding', 'accept-safety'));
    }
    if (role.key === 'sso-regulatory-reviewer') {
      grantedIds.push(permissionId('watchlist-finding', 'accept-regulatory'));
    }
    // "Authorised to approve the relevant Gate 11 impact" — Gate 11 is production
    // and launch release, so Quality (release) and the Final Approver. Regulatory
    // too, since several of E3(b)'s impact subjects are regulatory.
    if (['sso-quality-reviewer', 'sso-regulatory-reviewer', 'sso-final-approver'].includes(role.key)) {
      grantedIds.push(permissionId('change-impact', 'acknowledge'));
    }

    // "NP" is the company's final commercial authority. Which of the 17 SSO roles
    // that IS has never been stated, so Final Approver is a reading of the words
    // "commercial authority", not a confirmed mapping — part of [ASSUMPTION:
    // R5-Q18]. Like every grant here it is an editable starting point: the Role
    // Editor moves it without a code change.
    if (role.key === 'sso-final-approver') {
      grantedIds.push(permissionId('formulation-change', 'approve-commercial'));
    }

    // Reference data, per the function each answer names.
    //   q4  — "Regulatory maintains a configurable market profile"
    //   q17 — "controlled by authorised Technical, Safety and Regulatory users"
    //   q28 — "Technical AND Regulatory must both approve an entry"; the grant is
    //         who may EDIT, while the two-party approval is workflow inside the
    //         dataset itself and is not built yet.
    if (role.key === 'sso-regulatory-reviewer') {
      grantedIds.push(permissionId('reference:market-profile', 'edit'));
      grantedIds.push(permissionId('reference:rm-risk', 'edit'));
      grantedIds.push(permissionId('reference:claims-library', 'edit'));
    }
    // "Technical" in question 17 is R&I/Formulation here — the role that owns
    // ingredient knowledge. `sso-formulation-contributor` is its key.
    if (['sso-safety-reviewer', 'sso-formulation-contributor'].includes(role.key)) {
      grantedIds.push(permissionId('reference:rm-risk', 'edit'));
    }
    if (role.key === 'sso-published-info-technical-reviewer') {
      grantedIds.push(permissionId('reference:claims-library', 'edit'));
    }

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
// REVIEW_ROLES[].workbookName is ONLY the name of the account created here (the
// name the workbook prints for that area) — it is not a default value anywhere:
// the Create form starts every reviewer field empty and required.
//
// Departments reuse the existing demo department names where one fits, so this
// does not sprawl a new Department row per person.
//
// Each also gets ONE assignable SSO role (2026-07-26, user-requested — they were
// initially left role-less because the F6 role x review-area matrix is still
// open). Re-derived 2026-08-27 against the company's real job titles (see
// REVIEW_ROLES in reviewers.ts) rather than the earlier dev-invented
// functional-area names — still DERIVED, not SME-confirmed: change these rows
// when F6 answers, it is seed data, not logic. The app enforces one role per
// user (see admin-users.controller.ts), so each area gets exactly one even
// where the person wears two hats in the workbook (e.g. George is both R&I
// evidence owner and the C2 Department Study Reviewer — that second authority
// comes from the dedicated study-approval workflow, not from this role).
//
// Real behavioural consequences of this re-derivation, not silent:
//   - Chris, Tuan and George now all hold the SAME sso-formulation-contributor
//     grant (Chris because his real content, NPD Front-End Roadmap, is
//     R&I-flavoured; George because his label is literally "R&I") — "View as:
//     R&I/Formulation Contributor" now represents all three.
//   - Nguyen holds sso-final-approver, reflecting her being the company's real
//     CEO / project sponsor — a much broader grant than her old
//     sso-marketing-sales-contributor (canApprovePhase short-circuits true for
//     Final Approver on every phase of every project; DEMO_APPROVER_ROLE_KEY
//     below already points at this SSO key, so Nguyen is automatically
//     nomination-eligible for every phase's "Approved by" row too).
//   - Sankar and Kaukab now share sso-manufacturing-link-contributor —
//     coincidence of two different job titles (Production Support,
//     Facility/PM Operations) mapping to the closest available SSO grant, not
//     a mistake.
const REVIEW_OWNER_ROLES: Record<string, string> = {
  'project-manager': 'sso-formulation-contributor', // Chris — real content is NPD Front-End Roadmap (R&I-flavoured)
  formulation: 'sso-formulation-contributor', // Tuan
  ri: 'sso-formulation-contributor', // George — the SSO label is literally "R&I/Formulation Contributor"
  'quality-gmp': 'sso-quality-reviewer', // Sekar — GMP/Micro-PET evidence
  quality: 'sso-manufacturing-link-contributor', // Sankar — Production Support, Stability/Release
  regulatory: 'sso-regulatory-reviewer', // Chi Chu
  packaging: 'sso-packaging-artwork-contributor', // Lily — Sales Manager by title, but reviews packaging/artwork content
  'sales-marketing': 'sso-final-approver', // Nguyen — real CEO / project sponsor, not just Marketing/Sales content
  // --- judgement calls (no close SSO label): revisit when F6 answers ---
  'raw-material': 'sso-supply-chain-contributor', // Chidkamon — Raw Material Coordinator ~ procurement/supply
  'supply-chain': 'sso-supply-chain-contributor', // Hannah
  'facility-pm': 'sso-manufacturing-link-contributor', // Kaukab — Facility / PM Operations ~ manufacturing link
  'hr-quality': 'sso-quality-reviewer', // Lani — HR/Quality co-signs Quality areas
  // Digital / Platforms only CO-REVIEWS one register (Released Label Control) and
  // holds no gate-decision authority in the workbook, so Read-only Viewer —
  // which carries no decide/approve grants — matches the actual authority
  // better than inventing one. NOT "admin": administering the platform is a
  // different thing from having business decision rights.
  'digital-platforms': 'sso-read-only-viewer', // Anki
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
    const email = reviewOwnerEmail(role.workbookName);
    const departmentName = REVIEW_OWNER_DEPARTMENTS[role.key] ?? 'Management';
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: role.workbookName,
        department: {
          connectOrCreate: { where: { name: departmentName }, create: { name: departmentName } },
        },
      },
    });

    const roleKey = REVIEW_OWNER_ROLES[role.key];
    const dbRole = roleKey ? await prisma.role.findUnique({ where: { key: roleKey } }) : null;
    if (dbRole) {
      // The app enforces one role per user (admin-users.controller.ts) — a
      // plain upsert here does NOT: if REVIEW_OWNER_ROLES changes which SSO
      // role this person should hold (as it did 2026-08-27 for Chris/Sankar/
      // Nguyen), the old (userId, roleId) pair still matches nothing and a
      // SECOND UserRole row gets created alongside it, leaving the user with
      // two roles — a real gap this found, not a hypothetical one. Delete
      // every other role this user holds first so re-running the seed after
      // a mapping change actually converges to one row, not two.
      await prisma.userRole.deleteMany({
        where: { userId: user.id, roleId: { not: dbRole.id } },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: dbRole.id } },
        update: {},
        create: { userId: user.id, roleId: dbRole.id },
      });
    } else if (roleKey) {
      console.warn(`  ! review owner ${role.workbookName}: role "${roleKey}" not found — left without a role`);
    }

    assigned.push({ roleKey: role.key, userId: user.id, name: user.displayName });
  }
  console.log(
    `Seeded ${assigned.length} review-owner users with roles (${assigned.map((a) => a.name).join(', ')})`,
  );
  return assigned;
}

// The demo project's stand-in lead. One constant, because it is written in two
// places (create, and the repair path below) and they must not drift.
// Nguyen (2026-08-27, was Chris) — per the project owner, Nguyen is the
// company's real CEO and the actual project sponsor/lead, matching the
// review-role label change ('sales-marketing' -> "Project Lead", see
// reviewers.ts). Changing this constant alone does not reach an
// already-seeded project whose `projectLead` is still a real active user
// (the repair path below only fires when the current value matches NO active
// user) — the live dev database's `projects.projectLead` row needs its own
// direct update alongside this change.
const DEMO_PROJECT_LEAD = 'Nguyen';

// Who is NOMINATED to sign each phase's three sign-off rows on the demo project
// (D1: only the nominated person may sign, and the project's Lead nominates).
//
// Seeded by ROLE, never by name: the two rows below resolve through
// `project_reviewers`, so reassigning a review area on the project moves the
// nomination with it. The workbook has no worked example to copy — every sheet
// ships blank — so this is a temporary assignment to real accounts, in the
// project owner's own words: "seed vai trò thôi, nếu excel workbook không có
// thì cứ gán tạm 1 user trong app".
//
// Prepared by = the area the workbook's own phase sheet belongs to (PHASE1
// MKTG, PHASE2 NPD, PHASE3 QUAL, PHASE4 REG). Reviewed by = the 'quality' role
// (Sankar, labelled "Production Support" since 2026-08-27 — the role KEY is
// unchanged, only the display label), except on Phase 3 where 'quality'
// already prepares, so 'quality-gmp' (Sekar, "QA & Regulatory Affairs")
// reviews and the two rows stay two different people.
const DEMO_SIGNOFF_AREAS: Record<number, { preparedBy: string; reviewedBy: string }> = {
  1: { preparedBy: 'sales-marketing', reviewedBy: 'quality' },
  2: { preparedBy: 'formulation', reviewedBy: 'quality' },
  3: { preparedBy: 'quality', reviewedBy: 'quality-gmp' },
  4: { preparedBy: 'regulatory', reviewedBy: 'quality' },
};

// "Approved by" additionally needs the `phase:N|approve` capability, so it
// cannot be nominated from a review area directly — it resolves to whichever
// active user holds this SSO role. Historically that was only the generic
// per-SSO-role demo account (seedDemoUsers()); since 2026-08-27 Nguyen
// ('sales-marketing' review role, the company's real CEO/project sponsor)
// also holds it (see REVIEW_OWNER_ROLES above), so two accounts now qualify
// and `findFirst` below picks whichever the database returns first — not
// pinned to a specific one, since nothing here requires it to be.
const DEMO_APPROVER_ROLE_KEY = 'sso-final-approver';

// Fills the three nominations per phase, for rows that have none and are not
// already signed. Idempotent, and it never touches a nomination somebody made.
async function seedDemoSignOffNominations(projectId: string): Promise<void> {
  const reviewers = await prisma.projectReviewer.findMany({
    where: { projectId },
    select: { roleKey: true, userId: true },
  });
  const byArea = new Map(reviewers.filter((r) => r.userId).map((r) => [r.roleKey, r.userId!]));
  const approver = await prisma.user.findFirst({
    where: { active: true, roles: { some: { role: { key: DEMO_APPROVER_ROLE_KEY } } } },
    select: { id: true, displayName: true },
  });
  if (!approver) {
    console.warn(`  ! no active user holds ${DEMO_APPROVER_ROLE_KEY} — "Approved by" left unnominated`);
  }

  let nominated = 0;
  for (const [phase, areas] of Object.entries(DEMO_SIGNOFF_AREAS)) {
    const closure = await prisma.phaseClosure.findUnique({
      where: { projectId_phase: { projectId, phase: Number(phase) } },
      select: { id: true },
    });
    if (!closure) continue;
    const wanted: [string, string | undefined][] = [
      ['Prepared by', byArea.get(areas.preparedBy)],
      ['Reviewed by', byArea.get(areas.reviewedBy)],
      ['Approved by', approver?.id],
    ];
    for (const [role, userId] of wanted) {
      if (!userId) continue;
      const { count } = await prisma.signOff.updateMany({
        where: { phaseClosureId: closure.id, role, assignedToUserId: null, signedAt: null },
        data: { assignedToUserId: userId },
      });
      nominated += count;
    }
  }
  console.log(`Phase sign-off nominations: ${nominated} row(s) assigned by review area`);
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
    // Same additive spirit for `projectLead`, and for the same reason the
    // reviewers needed backfilling: this branch skips the scaffold, so the
    // 2026-07-26 change from a free-text 'Anna Tran' to a real account never
    // reached a database seeded before it. That went unnoticed until
    // 2026-08-20, when `projectLead` became the string deciding WHO MAY
    // NOMINATE phase sign-off signers (D1 / R5-Q1) — a lead nobody has an
    // account for means only an admin can nominate, with nothing saying so.
    //
    // Repaired only when the current value matches no active user, so a lead
    // somebody deliberately assigned is never overwritten.
    const leadIsRealUser = await prisma.user.findFirst({
      where: { displayName: existing.projectLead, active: true },
      select: { id: true },
    });
    if (!leadIsRealUser) {
      await prisma.project.update({
        where: { id: existing.id },
        data: { projectLead: DEMO_PROJECT_LEAD },
      });
    }
    console.log(
      `Demo project ${productCode} already present — scaffold skipped, ${added} review owner(s) backfilled` +
        (leadIsRealUser ? '' : `, projectLead "${existing.projectLead}" -> ${DEMO_PROJECT_LEAD} (no such active user)`),
    );
    await seedDemoSignOffNominations(existing.id);
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
      projectLead: DEMO_PROJECT_LEAD,
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
  const created = await prisma.project.findUniqueOrThrow({ where: { productCode }, select: { id: true } });
  await seedDemoSignOffNominations(created.id);
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
