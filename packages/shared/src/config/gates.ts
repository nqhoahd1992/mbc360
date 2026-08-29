import type { GateFieldChange } from '../types';

export interface GateMeta {
  id: string; // SG01..SG12
  number: string; // 01..12
  name: string;
  phase: number;
  purpose: string;
  primaryOwner: string;
  keyOutputs: string;
}

export interface PhaseMeta {
  phase: number;
  title: string;
  subtitle: string;
  department: string;
  color: string;
}

export const PHASES: PhaseMeta[] = [
  {
    phase: 1,
    title: 'Phase 1 - User & Product Definition',
    subtitle: 'Gates 1-3 (Marketing)',
    department: 'MARKETING / SALES / PROJECT OWNER',
    color: '#1677ff',
  },
  {
    phase: 2,
    title: 'Phase 2 - Ingredient & Formula Qualification',
    subtitle: 'Gates 4-6 (NPD)',
    department: 'NPD / R&I / PROCUREMENT / PACKAGING',
    color: '#722ed1',
  },
  {
    phase: 3,
    title: 'Phase 3 - Validation & Quality Control',
    subtitle: 'Gates 7-9 (Quality)',
    department: 'QUALITY / SAFETY / R&I / MANUFACTURING',
    color: '#fa8c16',
  },
  {
    phase: 4,
    title: 'Phase 4 - Evidence, Release & Improvement',
    subtitle: 'Gates 10-12 (Reg + Mgt)',
    department: 'REGULATORY / QUALITY / MANAGEMENT / SALES',
    color: '#52c41a',
  },
];

export const GATES: GateMeta[] = [
  {
    id: 'SG01',
    number: '01',
    name: 'Request & Opportunity',
    phase: 1,
    purpose:
      'Capture request, opportunity, requester, business reason and first screening decision.',
    primaryOwner: 'Project owner / Sales / NPD',
    keyOutputs: 'Request triage, project record, first decision',
  },
  {
    id: 'SG02',
    number: '02',
    name: 'Target User & Product Brief',
    phase: 1,
    purpose:
      'Define target user, life stage, market, brief, use context and success criteria.',
    primaryOwner: 'Project owner / Marketing / Regulatory',
    keyOutputs: 'Brief, target users, markets, success criteria',
  },
  {
    id: 'SG03',
    number: '03',
    name: 'Product Concept & Claims',
    phase: 1,
    purpose: 'Lock concept, claim direction, benchmark products and evidence needs.',
    primaryOwner: 'Marketing / Regulatory / R&I',
    keyOutputs: 'Claims brief, competitor review, evidence needs',
  },
  {
    id: 'SG04',
    number: '04',
    name: 'Ingredient & Supplier Screening',
    phase: 2,
    purpose:
      'Screen ingredients, raw materials, suppliers, regulatory status, availability and risk flags.',
    primaryOwner: 'R&I / Regulatory / Procurement',
    keyOutputs: 'RM evidence, supplier docs, risk flags',
  },
  {
    id: 'SG05',
    number: '05',
    name: 'Formula, BOM & Costing',
    phase: 2,
    purpose:
      'Confirm formula route, BOM, pH/process targets, costing and technical feasibility.',
    primaryOwner: 'R&I / Manufacturing / Finance',
    keyOutputs: 'Formula/BOM/costing, pH/process targets',
  },
  {
    id: 'SG06',
    number: '06',
    name: 'Packaging & Artwork Requirements',
    phase: 2,
    purpose:
      'Confirm pack type, components, artwork needs, compatibility needs and supplier approvals.',
    primaryOwner: 'Packaging / Artwork / Regulatory',
    keyOutputs: 'Pack components, artwork and compatibility plan',
  },
  {
    id: 'SG07',
    number: '07',
    name: 'Maternal & Baby-Contact Safety',
    phase: 3,
    purpose:
      'Complete maternal use, pregnancy/breastfeeding, infant-contact exposure and sensitive-user safety screening.',
    primaryOwner: 'Safety / Scientific Review / Quality',
    keyOutputs: 'Maternal + baby-contact risk assessment',
  },
  {
    id: 'SG08',
    number: '08',
    name: 'Testing, Methods & Validation',
    phase: 3,
    purpose:
      'Define testing, participant study requirements, method validation, QC and evidence generation plan.',
    primaryOwner: 'Quality / R&I / Study owner',
    keyOutputs: 'Testing plan, participant protocol and methods',
  },
  {
    id: 'SG09',
    number: '09',
    name: 'Stability, Compatibility & Release Readiness',
    phase: 3,
    purpose:
      'Confirm stability, preservation, pack compatibility, pilot/scale-up and release readiness.',
    primaryOwner: 'Quality / R&I / Manufacturing',
    keyOutputs: 'Stability, PET/micro, compatibility and release criteria',
  },
  {
    id: 'SG10',
    number: '10',
    name: 'Regulatory Dossier & Claims Evidence',
    phase: 4,
    purpose:
      'Complete claims evidence, country matching, PIF/CPSR mapping and distributor/HCP evidence pack needs.',
    primaryOwner: 'Regulatory / Claims / Safety',
    keyOutputs: 'PIF/CPSR map, claims evidence, HCP summary inputs',
  },
  {
    id: 'SG11',
    number: '11',
    name: 'Production, Launch & Sales Support Sign-Off',
    phase: 4,
    purpose:
      'Confirm production readiness, system records, launch sign-off and approved sales support.',
    primaryOwner: 'Manufacturing / Quality / Sales',
    keyOutputs: 'Production readiness, launch approvals, sales support',
  },
  {
    id: 'SG12',
    number: '12',
    name: 'Post-Market Monitoring & Improvement',
    phase: 4,
    purpose:
      'Capture market feedback, complaints, PV/PMS, CAPA, real-world performance and improvement actions.',
    primaryOwner: 'Quality / PV/PMS / Project owner',
    keyOutputs: 'Feedback, complaints, PV/PMS, CAPA, improvement actions',
  },
];

export const EIGHT_ANGLES = [
  'Consumer need',
  'Use context & life stage',
  'Ingredient suitability',
  'Formula compatibility',
  'Safety',
  'Quality',
  'Claims evidence',
  'Real-world performance',
];

// Requirement-row priority (Round 4 question 21, 2026-08-29). Deliberately NOT
// NEXT_ACTION_PRIORITIES, which is what these rows reused until now: "Criticality
// remains a risk concept, not a requirements-priority value." The two scales are
// not two spellings of one idea, so there is no mapping between them — see the
// migration note in 20260829060000_round4_requirement_priority_and_na.
export const REQUIREMENT_PRIORITIES = ['Must', 'Should', 'Could'] as const;

// The disposition a requirement row can carry where its section declares
// `allowNotApplicable` (Round 4 question 21): "The system must not require users
// to mark an empty requirement as Completed." A row set to it must also carry a
// rationale — enforced in `requirementsDispositioned`, not by the type.
export const REQUIREMENT_NOT_APPLICABLE = 'N/A';

// Costing / Commercial Feasibility Status (Round 4 question 36(b), 2026-08-29).
// Transcribed verbatim from the answer, including the trailing clause on the last
// value — it is what makes the rationale requirement readable on screen without a
// tooltip, and `costingStatusRecorded` enforces it.
export const COSTING_FEASIBILITY_STATUSES = [
  'Not Started',
  'In Progress',
  'Commercially Feasible',
  'Feasible with Conditions',
  'Not Feasible',
  'N/A — rationale required',
] as const;

export const COSTING_STATUS_NOT_APPLICABLE = 'N/A — rationale required';

// Generic work-item status (Requirement / Evidence / Change / CAPA rows)
export const WORK_STATUSES = [
  'Not Started',
  'In Progress',
  'Completed',
  'On Hold',
  'Backtracked',
] as const;

// Gate "Stage status" — matches the real MBc360 workbook dropdown exactly
export const STAGE_STATUSES = ['Not Started', 'In Progress', 'Complete', 'Gap', 'Hold', 'N/A'] as const;

// Gate "Gate decision" — matches the real MBc360 workbook dropdown exactly
export const GATE_DECISIONS = [
  'Proceed',
  'Proceed with Conditions',
  'Hold',
  'Backtrack',
  'N/A',
] as const;

// Display labels for GateFieldChange.field — shared between the Project
// Overview "Gate change log" card and the per-gate history popup on the
// Phase Gate Flow table, so both render the same wording.
export const GATE_FIELD_LABELS: Record<GateFieldChange['field'], string> = {
  status: 'Stage status',
  decision: 'Gate decision',
  owner: 'Owner',
  dueDate: 'Due date',
  evidenceLink: 'Evidence link',
  notes: 'Notes',
  // Round 4 question 3 (2026-08-24). These read in the change log exactly like the
  // six above, which is the point: downgrading a gap from Critical shows up in the
  // history next to the decision it unblocked, rather than being invisible.
  gapCriticality: 'Gap criticality',
  gapImpactCategory: 'Gap impact category',
  gapAssessor: 'Gap assessor',
  gapAssessmentDate: 'Gap assessment date',
  gapRationale: 'Gap rationale',
  gapEvidenceLink: 'Gap evidence link',
  gapRequiredAction: 'Gap required action',
  gapActionOwner: 'Gap action owner',
};
