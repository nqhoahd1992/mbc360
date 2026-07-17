// Server-side port of apps/web/src/store/factory.ts (BACKEND_PLAN M1):
// a brand-new project's scaffold rows are generated purely from the shared
// config files, so config stays the single source of truth for what an empty
// project's forms look like. Used by the seeder now and by POST /projects (M3).
import { EIGHT_ANGLES, GATES } from '@mbc360/shared/config/gates';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { EVIDENCE_AREAS } from '@mbc360/shared/config/evidence';
import { REGISTER_CONFIGS } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import type { Prisma } from '../generated/prisma/client';

export interface NewProjectInput {
  productCode: string;
  projectLead: string;
  productGroup: string;
  brandCustomer: string;
  dateOpened: Date;
  targetLaunchDate: Date;
  productSku: string;
  ownerDepartment: string;
  markets: string[];
}

const SIGN_OFF_ROLES = ['Prepared by', 'Reviewed by', 'Approved by'] as const;
const STUDY_APPROVAL_ROLES = ['Study Author', 'Department Reviewer', 'Independent Reviewer'] as const;
const INITIAL_FORMULA_VERSION = 'F1.0';

// Mirrors factory.ts seedRegisters(): 'fixed' registers start with their
// predefined reference rows (checkbox columns false, status 'Not Started');
// 'register' mode starts empty.
function seedRegisterRowCreates(): Prisma.RegisterRowCreateWithoutProjectInput[] {
  const creates: Prisma.RegisterRowCreateWithoutProjectInput[] = [];
  for (const config of REGISTER_CONFIGS) {
    if (config.mode !== 'fixed') continue;
    (config.fixedRows ?? []).forEach((row, index) => {
      const seeded: RegisterRow = { ...row };
      for (const col of config.columns) {
        if (seeded[col.key] !== undefined) continue;
        if (col.type === 'checkbox') seeded[col.key] = false;
        else if (col.key === 'status') seeded[col.key] = 'Not Started';
      }
      creates.push({
        registerKey: config.key,
        rowOrder: index,
        data: seeded as Prisma.InputJsonValue,
      });
    });
  }
  return creates;
}

function checklistItemCreates(): Prisma.ChecklistItemCreateWithoutProjectInput[] {
  const creates: Prisma.ChecklistItemCreateWithoutProjectInput[] = [];
  for (const config of Object.values(PHASE_CONFIGS)) {
    for (const section of config.checklistSections) {
      section.options.forEach((label, index) => {
        creates.push({
          sectionKey: section.key,
          itemOrder: index,
          label,
          gate: section.gate,
          ownerFunction: section.ownerFunction,
        });
      });
    }
  }
  return creates;
}

function requirementItemCreates(): Prisma.RequirementItemCreateWithoutProjectInput[] {
  const creates: Prisma.RequirementItemCreateWithoutProjectInput[] = [];
  for (const config of Object.values(PHASE_CONFIGS)) {
    for (const section of config.requirementSections) {
      section.rows.forEach((row, index) => {
        creates.push({
          sectionKey: section.key,
          itemOrder: index,
          gate: row.gate,
          requirement: row.requirement,
          minimumRequirement: row.minimum,
          rationale: row.rationale,
          owner: row.owner,
        });
      });
    }
  }
  return creates;
}

function gateCheckCreates(): Prisma.GateCheckCreateWithoutProjectInput[] {
  return Object.values(PHASE_CONFIGS).flatMap((config) =>
    config.keyGateChecks.map((kc) => ({ gate: kc.gate, check: kc.check })),
  );
}

function phaseClosureCreates(): Prisma.PhaseClosureCreateWithoutProjectInput[] {
  return Object.values(PHASE_CONFIGS).map((config) => ({
    phase: config.phase,
    evidenceSummary: '',
    signOffs: { create: SIGN_OFF_ROLES.map((role) => ({ role })) },
    angles: { create: EIGHT_ANGLES.map((angle) => ({ angle })) },
  }));
}

// Creates a project with its full empty scaffold plus the initial formula
// version, and links every market track to that version. Run inside the
// caller's transaction so scaffold + audit event commit atomically.
export async function createProjectWithScaffold(
  tx: Prisma.TransactionClient,
  input: NewProjectInput,
): Promise<{ projectId: string; formulaVersionId: string }> {
  const project = await tx.project.create({
    data: {
      productCode: input.productCode,
      projectLead: input.projectLead,
      productGroup: input.productGroup,
      brandCustomer: input.brandCustomer,
      dateOpened: input.dateOpened,
      targetLaunchDate: input.targetLaunchDate,
      productSku: input.productSku,
      ownerDepartment: input.ownerDepartment,
      markets: { create: input.markets.map((market) => ({ market })) },
      gates: { create: GATES.map((g) => ({ gateId: g.id })) },
      checklistItems: { create: checklistItemCreates() },
      requirementItems: { create: requirementItemCreates() },
      gateChecks: { create: gateCheckCreates() },
      phaseClosures: { create: phaseClosureCreates() },
      costing: {
        create: {
          batchSizeKg: 100,
          fillSizeG: 100,
          targetUnits: 1000,
          packagingCostPerUnit: 0,
          labourOverheadPerUnit: 0,
          freightOtherPerUnit: 0,
          targetSellPrice: 0,
        },
      },
      evidenceItems: { create: EVIDENCE_AREAS.map((e) => ({ ...e })) },
      registerRows: { create: seedRegisterRowCreates() },
      studyApprovals: { create: STUDY_APPROVAL_ROLES.map((role) => ({ role })) },
      formulaVersions: { create: [{ version: INITIAL_FORMULA_VERSION }] },
    },
    include: { formulaVersions: true },
  });

  const formulaVersionId = project.formulaVersions[0].id;
  await tx.marketTrack.createMany({
    data: input.markets.map((market) => ({
      projectId: project.id,
      market,
      formulaVersionId,
    })),
  });

  return { projectId: project.id, formulaVersionId };
}
