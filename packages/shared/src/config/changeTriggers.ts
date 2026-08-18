import { PHASES } from './gates';
import type { ChangeStatus } from '../types';

// Change-control lifecycle statuses (confirmed rule F9), in workflow order.
export const CHANGE_STATUSES: ChangeStatus[] = [
  'Draft',
  'Submitted',
  'Under Review',
  'Approved - Implementation Pending',
  'In Implementation',
  'Verification Pending',
  'On Hold',
  'Completed',
  'Rejected',
  'Cancelled',
  'Superseded',
];

// The four terminal states: a change in one of these no longer soft-locks a gate
// (F9 — "Completed, Rejected, Cancelled and Superseded are treated as closed,
// provided the final disposition is recorded"). Everything else counts as open.
export const CHANGE_CLOSED_STATUSES: ChangeStatus[] = [
  'Completed',
  'Rejected',
  'Cancelled',
  'Superseded',
];

// Rule E3(b), Gate 11. The seven impacted subjects are transcribed from the
// team's own sentence — "Formula, artwork, claims, safety, regulatory, packaging
// or release-impacting change" — plus the two ends of their scale: the
// launch-impacting case that hard-blocks even Proceed with Conditions, and the
// low-risk administrative case that Proceed with Conditions may clear.
export const CHANGE_IMPACT_LAUNCH = 'Launch-impacting';
export const CHANGE_IMPACT_ADMIN = 'Administrative only';
export const CHANGE_IMPACT_AREAS = [
  CHANGE_IMPACT_LAUNCH,
  'Formula',
  'Artwork',
  'Claims',
  'Safety',
  'Regulatory',
  'Packaging',
  'Release',
  CHANGE_IMPACT_ADMIN,
] as const;

// The seven that hard-block at Gate 11 while the change is open — everything
// except the launch case (which blocks harder) and the administrative one
// (which blocks softer).
export const CHANGE_IMPACT_BLOCKING_AREAS: readonly string[] = CHANGE_IMPACT_AREAS.filter(
  (a) => a !== CHANGE_IMPACT_LAUNCH && a !== CHANGE_IMPACT_ADMIN,
);

export function isChangeOpen(status: ChangeStatus): boolean {
  return !CHANGE_CLOSED_STATUSES.includes(status);
}

// Major-vs-minor formula-change classification framework (confirmed rule F5).
// A change is MAJOR if it may affect ANY of these; a MINOR change is one
// demonstrated not to affect safety, efficacy, regulatory status, claims,
// specifications or product performance. The initiator proposes by selecting
// the criteria that apply; an authorised technical/quality reviewer must
// confirm the classification (reviewer authorisation itself lands with F6).
export interface MajorChangeCriterion {
  id: string;
  label: string;
}

export const MAJOR_CHANGE_CRITERIA: MajorChangeCriterion[] = [
  { id: 'safety-exposure', label: 'Safety or exposure' },
  { id: 'efficacy-claims', label: 'Product efficacy or claim support' },
  { id: 'preservative', label: 'Preservative system' },
  { id: 'ingredient-identity', label: 'Ingredient identity' },
  { id: 'active-concentration', label: 'Active concentration' },
  { id: 'regulatory-status', label: 'Regulatory status' },
  { id: 'allergen', label: 'Allergen profile' },
  { id: 'ph-range', label: 'pH outside the approved range' },
  { id: 'product-form', label: 'Product form or physical characteristics' },
  { id: 'process-potency', label: 'Manufacturing process affecting ingredient potency or product performance' },
  { id: 'stability', label: 'Stability' },
  { id: 'packaging-compat', label: 'Packaging compatibility' },
  { id: 'label-declaration', label: 'Label ingredient declaration' },
  { id: 'market-registration', label: 'Market notification or registration' },
];

// Consolidated change-control trigger catalogue, synthesised from the workbook's
// three trigger sheets: Formula_Change_Control, Artwork_Change_Control and
// PIF_Evidence_Closure. Each trigger declares the gate(s) it touches; the phase(s)
// affected are derived from the gate numbers (gates 1-3 = Phase 1, 4-6 = Phase 2,
// 7-9 = Phase 3, 10-12 = Phase 4). 'ALL' = every gate/phase.
export type ChangeTriggerCategory = 'Formula' | 'Artwork / Label' | 'PIF / Evidence';

export interface ChangeTrigger {
  id: string;
  category: ChangeTriggerCategory;
  label: string;
  examples?: string;
  action?: string;
  owner?: string;
  signOffs?: string;
  gates: string[]; // '01'..'12' or 'ALL'
}

export const CHANGE_TRIGGERS: ChangeTrigger[] = [
  // --- Formula_Change_Control (Gate 05/08) --------------------------------
  {
    id: 'formula-ingredient',
    category: 'Formula',
    label: 'Ingredient added or removed',
    examples: 'New active, preservative, fragrance or problematic ingredient removed',
    action: 'Update Formula_BOM; screen safety lists; assess claim and label impact',
    owner: 'R&I / Formulation',
    signOffs: 'R&I; Regulatory + Quality',
    gates: ['05', '08'],
  },
  {
    id: 'formula-level',
    category: 'Formula',
    label: 'Ingredient percentage or active level changed',
    examples: 'Active increase/decrease, preservative or humectant balance',
    action: 'Re-check claim map, potency controls and evidence need',
    owner: 'R&I',
    signOffs: 'R&I / Scientific Review; Quality + Regulatory where impacted',
    gates: ['05', '08'],
  },
  {
    id: 'formula-ph-process',
    category: 'Formula',
    label: 'pH range or process changed',
    examples: 'Heat/cool order, addition temperature, homogenisation, hold time',
    action: 'Update process instructions and critical control points',
    owner: 'R&I + Manufacturing',
    signOffs: 'R&I + Manufacturing; Quality',
    gates: ['05', '08'],
  },
  {
    id: 'formula-supplier',
    category: 'Formula',
    label: 'Supplier / raw material / manufacturer change',
    examples: 'New supplier, grade, site or manufacturer',
    action: 'Re-qualify material and compare specs',
    owner: 'Procurement + R&I',
    signOffs: 'R&I; Quality + Regulatory',
    gates: ['05', '08'],
  },
  {
    id: 'formula-fragrance',
    category: 'Formula',
    label: 'Fragrance / allergen / sensory change',
    examples: 'Perfume changed/removed, essential oil level',
    action: 'Update allergen and caution checks; update artwork',
    owner: 'R&I + Regulatory',
    signOffs: 'R&I; Regulatory + Quality',
    gates: ['05', '08'],
  },
  // --- Artwork_Change_Control ---------------------------------------------
  {
    id: 'artwork-error',
    category: 'Artwork / Label',
    label: 'Artwork error discovered',
    examples: 'Wrong wording, typo, ingredient list, warning, barcode or country text',
    action: 'Raise Change_Control_Comm; freeze current file; create redline',
    owner: 'Artwork / Packaging owner',
    signOffs: 'Regulatory + Quality + Marketing/Sales where label-facing',
    gates: ['06', '10', '11'],
  },
  {
    id: 'artwork-formula-label',
    category: 'Artwork / Label',
    label: 'Formula change affects label',
    examples: 'INCI order, ingredient addition/removal, active level, allergen/fragrance',
    action: 'Link Formula_Change_Control and hold label release until formula locked',
    owner: 'R&I + Artwork owner',
    signOffs: 'R&I + Regulatory + QA',
    gates: ['05', '06', '10'],
  },
  {
    id: 'artwork-reg-update',
    category: 'Artwork / Label',
    label: 'Regulatory or market update',
    examples: 'New country label requirement, warning, language or symbol',
    action: 'Identify affected SKUs/materials and route to review',
    owner: 'Regulatory owner',
    signOffs: 'Regulatory + QA + market owner',
    gates: ['10', '11'],
  },
  {
    id: 'artwork-claim-copy',
    category: 'Artwork / Label',
    label: 'Marketing / claim copy change',
    examples: 'New or revised claim/HCP/website/leaflet wording',
    action: 'Map claim to evidence; no live use until approved',
    owner: 'Marketing / Claims owner',
    signOffs: 'Regulatory + Scientific Review',
    gates: ['03', '10'],
  },
  // --- PIF_Evidence_Closure (re-validation triggers) ----------------------
  {
    id: 'pif-launch',
    category: 'PIF / Evidence',
    label: 'New product launch or new market',
    action: 'Open PIF_Evidence_Export; confirm mandatory sections and attachments',
    owner: 'Regulatory / PIF owner',
    gates: ['10', '11'],
  },
  {
    id: 'pif-catchup',
    category: 'PIF / Evidence',
    label: 'In-market catch-up review',
    action: 'Attach current claims, safety and performance reports to each SKU PIF',
    owner: 'Regulatory / Project owner',
    gates: ['10', '12'],
  },
  {
    id: 'pif-claim',
    category: 'PIF / Evidence',
    label: 'New or changed claim',
    action: 'Add claim to SKU_Claims_PIF_Register and attach support',
    owner: 'Regulatory / Claims owner',
    gates: ['03', '10'],
  },
  {
    id: 'pif-test-report',
    category: 'PIF / Evidence',
    label: 'New test report',
    action: 'Index report and attach to PIF if required',
    owner: 'R&I / Quality',
    gates: ['08', '10'],
  },
  {
    id: 'pif-any-change',
    category: 'PIF / Evidence',
    label: 'Formula / supplier / fragrance / pH / process / artwork change',
    action: 'Assess evidence validity and update linked PIF records',
    owner: 'R&I / Regulatory / QA',
    gates: ['ALL'],
  },
  {
    id: 'pif-hcp-question',
    category: 'PIF / Evidence',
    label: 'Distributor / pharmacy / HCP question',
    action: 'Answer only from approved PMF/PIF evidence and wording',
    owner: 'Regulatory / Scientific Review',
    gates: ['10', '11'],
  },
  {
    id: 'pif-public-info',
    category: 'PIF / Evidence',
    label: 'Updated public information',
    action: 'Check publication approval and attach final record',
    owner: 'Content owner / Regulatory',
    gates: ['10', '11'],
  },
];

// RACI / Closure Control — the standard responsibility matrix that gates closure
// of every change (transcribed from the Change_Ctrl_Comm sheet's second block).
export type RaciRole = 'Accountable' | 'Responsible' | 'Approver' | 'Informed / acknowledgement';

export interface ChangeRaciRow {
  functionName: string;
  role: RaciRole;
  contribution: string;
  linkedEvidence: string;
}

export const CHANGE_RACI: ChangeRaciRow[] = [
  {
    functionName: 'Project owner',
    role: 'Accountable',
    contribution: 'Opens change, coordinates owners and closure',
    linkedEvidence: 'Change_Control_Comm',
  },
  {
    functionName: 'R&I / Formulation',
    role: 'Responsible',
    contribution: 'Assesses formula/process/ingredient impact',
    linkedEvidence: 'Formula_Change_Control',
  },
  {
    functionName: 'Regulatory',
    role: 'Approver',
    contribution: 'Assesses label, claims, market and PIF impact',
    linkedEvidence: 'Artwork_Change_Control; PIF_Evidence_Closure',
  },
  {
    functionName: 'Quality',
    role: 'Approver',
    contribution: 'Assesses release, GMP, stability, deviation/CAPA impact',
    linkedEvidence: 'GMP_Links; Stability_Release',
  },
  {
    functionName: 'Sales/Marketing',
    role: 'Informed / acknowledgement',
    contribution: 'Receives approved external/customer-facing explanation',
    linkedEvidence: 'Change_Templates',
  },
];

export function getChangeTrigger(id: string | undefined): ChangeTrigger | undefined {
  if (!id) return undefined;
  return CHANGE_TRIGGERS.find((t) => t.id === id);
}

// Phases affected, derived from the gate numbers (ceil(gate / 3)).
export function triggerPhases(gates: string[]): number[] {
  if (gates.includes('ALL')) return PHASES.map((p) => p.phase);
  const set = new Set<number>();
  for (const g of gates) {
    const n = parseInt(g, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 12) set.add(Math.ceil(n / 3));
  }
  return [...set].sort((a, b) => a - b);
}

// e.g. "Phase 2 · NPD"
export function phaseShortLabel(phase: number): string {
  const p = PHASES.find((x) => x.phase === phase);
  const paren = p?.subtitle.match(/\(([^)]+)\)/)?.[1];
  return paren ? `Phase ${phase} · ${paren}` : `Phase ${phase}`;
}
