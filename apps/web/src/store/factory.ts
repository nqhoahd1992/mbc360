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
    if (col.type === 'checkbox') row[col.key] = false;
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
        if (col.type === 'checkbox') seeded[col.key] = false;
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
    costing: {
      batchSizeKg: 100,
      fillSizeG: 100,
      targetUnits: 1000,
      packagingCostPerUnit: 0,
      labourOverheadPerUnit: 0,
      freightOtherPerUnit: 0,
      targetSellPrice: 0,
    },
    evidence: EVIDENCE_AREAS.map((e) => ({ ...e, status: 'Not Started' })),
    capa: [],
    feedback: [],
    registers: seedRegisters(),
    nextActions: [],
    backtrackEvents: [],
    marketTracks,
    studyApprovals: [
      { role: 'Study Author' },
      { role: 'Department Reviewer' },
      { role: 'Independent Reviewer' },
    ],
    formulaVersion: 'F1.0',
    formulaVersionHistory: [],
  };
}
