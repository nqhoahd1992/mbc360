import type {
  AngleRow,
  ChecklistItem,
  GateCheck,
  PhaseClosure,
  ProjectData,
  ProjectIdentity,
  RequirementItem,
} from '../types';
import { EIGHT_ANGLES, GATES } from '../config/gates';
import { PHASE_CONFIGS } from '../config/phases';
import { EVIDENCE_AREAS } from '../config/evidence';

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

  return {
    identity,
    gates: GATES.map((g) => ({ gateId: g.id, status: 'Not Started' })),
    checklists,
    requirements,
    gateChecks,
    phaseClosures,
    bom: [],
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
  };
}
