// Generic work-item status, used by Requirement / Evidence / Change / CAPA rows.
export type WorkStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Backtracked';

// Gate "Stage status" — matches the real MBc360 workbook dropdown exactly
// (Not Started, In Progress, Complete, Gap, Hold, N/A).
export type StageStatus = 'Not Started' | 'In Progress' | 'Complete' | 'Gap' | 'Hold' | 'N/A';

// Gate "Gate decision" — matches the real MBc360 workbook dropdown exactly
// (Proceed, Proceed with Conditions, Hold, Backtrack, N/A). Also reused for the
// phase closure sign-off Decision column, which uses the same list in the source file.
export type GateDecision = 'Proceed' | 'Proceed with Conditions' | 'Hold' | 'Backtrack' | 'N/A';

export type YNNA = 'Y' | 'N' | 'NA';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface GateRecord {
  gateId: string; // SG01..SG12
  status: StageStatus;
  decision?: GateDecision;
  owner?: string;
  dueDate?: string;
  evidenceLink?: string;
  notes?: string;
}

export interface ChecklistItem {
  label: string;
  gate: string;
  selected: boolean;
  ownerFunction: string;
  status: YNNA;
  evidenceLink?: string;
  notes?: string;
}

export interface RequirementItem {
  gate: string;
  requirement: string;
  minimumRequirement: string;
  rationale: string;
  owner: string;
  status: WorkStatus;
  evidenceLink?: string;
  notes?: string;
}

export interface GateCheck {
  gate: string;
  check: string;
  done: boolean;
  ynna: YNNA;
  date?: string;
  evidenceRef?: string;
  methodRef?: string;
  internalLink?: string;
  initials?: string;
  notes?: string;
}

export interface AngleRow {
  angle: string;
  ynna: YNNA;
  covered: boolean;
  date?: string;
  evidenceRef?: string;
  internalLink?: string;
  initials?: string;
  comments?: string;
}

export type SignOffRole = 'Prepared by' | 'Reviewed by' | 'Approved by';

export interface SignOff {
  role: SignOffRole;
  name?: string;
  initials?: string;
  date?: string;
  decision?: string;
  comments?: string;
}

export interface PhaseClosure {
  evidenceSummary?: string;
  signOffs: SignOff[];
  angles: AngleRow[];
  nextAction?: string;
  nextDueDate?: string;
  nextOwner?: string;
}

export interface BomLine {
  line: number;
  rmCode: string;
  inciName: string;
  functionRole: string;
  supplier: string;
  percentWw: number;
  costPerKg: number;
  evidenceLink?: string;
  notes?: string;
}

export interface PackagingBomLine {
  line: number;
  component: string;
  componentType: string;
  supplier: string;
  unitsPerFinishedUnit: number;
  unitCost: number;
  wastagePercent: number;
  leadTime?: string;
  moq?: string;
  evidenceLink?: string;
  methodRef?: string;
  notes?: string;
  approval?: string;
}

export interface CostingInputs {
  batchSizeKg: number;
  fillSizeG: number;
  targetUnits: number;
  packagingCostPerUnit: number;
  labourOverheadPerUnit: number;
  freightOtherPerUnit: number;
  targetSellPrice: number;
}

export interface EvidenceItem {
  area: string;
  required: 'Y' | 'Conditional';
  trigger: string;
  primaryTemplate: string;
  owner: string;
  status: WorkStatus;
  gate: string;
  evidenceLink?: string;
  notes?: string;
}

export interface CapaRecord {
  id: string;
  market: string;
  eventType: string;
  summary: string;
  severity: RiskLevel;
  status: WorkStatus;
  owner: string;
  notes?: string;
}

export interface FeedbackEntry {
  id: string;
  testerName: string;
  gender: 'M' | 'F';
  dept: string;
  dateTested: string;
  texture: number; // 1-5
  fragrance: number; // 1-5
  overall: number; // 1-5
  tooOilySlippery: boolean; // SAFETY flag
  wouldRecommend: boolean;
  bestLiked?: string;
  concerns?: string;
}

export interface ChangeRecord {
  changeId: string;
  projectId?: string;
  triggerId?: string; // links to a CHANGE_TRIGGERS entry (affected gates/phases)
  trigger: string;
  productSku: string;
  affectedArea: string;
  oldVersion?: string;
  riskLevel: RiskLevel;
  requiredAction?: string;
  evidenceLink?: string;
  requiredSignOffs?: string;
  communicationRequired: boolean;
  salesMarketingMessage?: string;
  dueDate?: string;
  status: WorkStatus;
  closureEvidence?: string;
  closedDate?: string;
  owner: string;
  notes?: string;
}

export interface ProjectIdentity {
  id: string;
  productCode: string;
  projectLead: string;
  productGroup: string;
  brandCustomer: string;
  dateOpened: string;
  targetLaunchDate: string;
  productSku: string;
  ownerDepartment: string;
  markets: string[];
}

// Generic evidence-register row (Supplier_RM_Evidence, Prohibited_Ingredients,
// Test_Report_Index, PIF_Checklist_ASEAN, ...). Shape varies per register, so it's a
// free-form record; RegisterConfig (config/registers.ts) declares the real columns.
export type RegisterRow = Record<string, string | number | boolean | undefined>;

export interface ProjectData {
  identity: ProjectIdentity;
  gates: GateRecord[];
  checklists: Record<string, ChecklistItem[]>;
  requirements: Record<string, RequirementItem[]>;
  gateChecks: GateCheck[];
  phaseClosures: Record<number, PhaseClosure>; // keyed by phase 1..4
  bom: BomLine[];
  packagingBom: PackagingBomLine[];
  costing: CostingInputs;
  evidence: EvidenceItem[];
  capa: CapaRecord[];
  feedback: FeedbackEntry[];
  registers: Record<string, RegisterRow[]>; // keyed by RegisterConfig.key
}
