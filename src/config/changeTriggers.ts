import { PHASES } from './gates';

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
