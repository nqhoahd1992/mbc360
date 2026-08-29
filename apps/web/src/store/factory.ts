import type {
  AngleRow,
  ChecklistItem,
  GateCheck,
  PhaseClosure,
  ProjectData,
  ProjectIdentity,
  RegisterRow,
  RequirementItem,
} from '@mbc360/shared/types';
import { EIGHT_ANGLES, GATES } from '@mbc360/shared/config/gates';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { EVIDENCE_AREAS } from '@mbc360/shared/config/evidence';
import { REGISTER_CONFIGS, getRegisterConfig } from '@mbc360/shared/config/registers';

export function createEmptyRegisterRow(registerKey: string): RegisterRow {
  const config = getRegisterConfig(registerKey);
  const row: RegisterRow = {};
  if (!config) return row;
  for (const col of config.columns) {
    // An explicit config default wins: D4 needs a new Supplier & RM Evidence row
    // to read "Incomplete — evidence review required" from the moment it exists,
    // and that has to hold for a row a person adds as much as for a Cosmetri
    // import stub — both are equally unreviewed.
    if (col.defaultValue !== undefined) row[col.key] = col.defaultValue;
    else if (col.type === 'checkbox') row[col.key] = false;
    else if (col.key === 'status') row[col.key] = 'Not Started';
  }
  return row;
}

function seedRegisters(): Record<string, RegisterRow[]> {
  const registers: Record<string, RegisterRow[]> = {};
  for (const config of REGISTER_CONFIGS) {
    if (config.mode !== 'fixed') {
      registers[config.key] = [];
      continue;
    }
    registers[config.key] = (config.fixedRows ?? []).map((row) => {
      const seeded: RegisterRow = { ...row };
      for (const col of config.columns) {
        if (seeded[col.key] !== undefined) continue;
        if (col.defaultValue !== undefined) seeded[col.key] = col.defaultValue;
        else if (col.type === 'checkbox') seeded[col.key] = false;
        else if (col.key === 'status') seeded[col.key] = 'Not Started';
      }
      return seeded;
    });
  }
  return registers;
}

function emptyAngles(): AngleRow[] {
  return EIGHT_ANGLES.map((angle) => ({ angle, ynna: 'NA', covered: false }));
}

function emptyClosure(): PhaseClosure {
  return {
    evidenceSummary: '',
    signOffs: [
      { role: 'Prepared by' },
      { role: 'Reviewed by' },
      { role: 'Approved by' },
    ],
    angles: emptyAngles(),
  };
}

export function createEmptyProject(identity: ProjectIdentity): ProjectData {
  const checklists: Record<string, ChecklistItem[]> = {};
  const requirements: Record<string, RequirementItem[]> = {};
  const gateChecks: GateCheck[] = [];
  const phaseClosures: Record<number, PhaseClosure> = {};

  for (const config of Object.values(PHASE_CONFIGS)) {
    for (const section of config.checklistSections) {
      checklists[section.key] = section.options.map((label) => ({
        label,
        gate: section.gate,
        selected: false,
        ownerFunction: section.ownerFunction,
        status: 'NA',
      }));
    }
    for (const section of config.requirementSections) {
      requirements[section.key] = section.rows.map((row) => ({
        gate: row.gate,
        requirement: row.requirement,
        minimumRequirement: row.minimum,
        priority: undefined,
        rationale: row.rationale,
        owner: row.owner,
        status: 'Not Started',
      }));
    }
    for (const kc of config.keyGateChecks) {
      gateChecks.push({ gate: kc.gate, check: kc.check, done: false, ynna: 'NA' });
    }
    phaseClosures[config.phase] = emptyClosure();
  }

  const marketTracks = identity.markets.map((market) => ({
    market,
    pifStatus: 'Not Started' as const,
    regulatoryStatus: 'Not Started' as const,
    claimsApproval: 'Not Started' as const,
    launchApproval: 'Not Started' as const,
  }));

  return {
    identity,
    gates: GATES.map((g) => ({ gateId: g.id, status: 'Not Started' })),
    checklists,
    requirements,
    gateChecks,
    phaseClosures,
    bom: [],
    packagingBom: [],
    formulaProperties: {},
    // Round 4 questions 8/9/11/12: every answer starts absent, and that is the
    // point — absent means "not yet assessed", which blocks. Seeding a default
    // here would answer them on the user's behalf.
    assessments: {},
    costing: {
      batchSizeKg: 100,
      fillSizeG: 100,
      targetUnits: 1000,
      packagingCostPerUnit: 0,
      labourOverheadPerUnit: 0,
      freightOtherPerUnit: 0,
      targetSellPrice: 0,
    },
    // Company reference data is not part of a new project's shape — the API fills
    // it on every read. Empty here rather than fetched, and empty is the SAFE
    // direction: an unclassified raw material makes the Gate 4 allergen trigger
    // read "not assessed", which blocks, so a project built locally can never
    // under-report a risk this object happens not to be holding yet.
    reference: { marketProfiles: [], rmRisk: [] },
    evidence: EVIDENCE_AREAS.map((e) => ({ ...e, status: 'Not Started' })),
    capa: [],
    feedback: [],
    registers: seedRegisters(),
    // Populated by the API from RegisterClosure rows; empty here since this
    // factory only builds the frontend's pre-M3 demo shape.
    registerClosures: {},
    nextActions: [],
    changes: [],
    backtrackEvents: [],
    gateChangeLog: [],
    marketTracks,
    // Per-gate sign-off rows are created lazily by the API (on nomination or
    // signing), because the per-market lanes at Gates 10-12 depend on a market
    // list that changes during the project. An empty array is the correct
    // starting state: nothing signed anywhere.
    gateSignOffs: [],
    // Round 4 questions 2 and 13 — both are records of acts (a person's
    // supersession decision, a completed post-launch review), so a new project has
    // none. The review SCHEDULE is derived from each market's actual launch date;
    // nothing is scaffolded.
    supersessionDecisions: [],
    postLaunchReviews: [],
    studyApprovals: [
      { role: 'Study Author' },
      { role: 'Department Reviewer' },
      { role: 'Independent Reviewer' },
    ],
    formulaVersion: 'F1.0',
    formulaVersionHistory: [],
  };
}
