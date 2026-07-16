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
  casNo?: string; // CAS number — filled by the Cosmetri import; used for exact watch-list matching (C3)
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

// Dedicated Study / Human Trial approval workflow (confirmed rule C2) —
// separate from the generic phase sign-off. Roles, not named individuals; the
// Independent Reviewer must not belong to the Study Author's department.
export type StudyApprovalRole = 'Study Author' | 'Department Reviewer' | 'Independent Reviewer';

export interface StudyApproval {
  role: StudyApprovalRole;
  name?: string;
  department?: string;
  date?: string;
  decision?: string;
  comments?: string;
}

// Formula version record (confirmed rule A2): a major formulation change
// creates a new version and reopens Gates 4-9; previous versions are preserved
// for audit history.
export interface FormulaVersionRecord {
  version: string;
  previousVersion: string;
  date: string;
  changeType: 'Major' | 'Minor';
  reason?: string;
  initiatedBy?: string;
}

// Controlled follow-up action attached to a gate (confirmed rule B2). Open
// actions block a plain "Proceed" pass — they may stay open only under a
// "Proceed with Conditions" decision.
export type NextActionStatus = 'Open' | 'In Progress' | 'Done';
export type NextActionPriority = 'Low' | 'Medium' | 'High';

export interface NextAction {
  id: string;
  gateId: string; // SG01..SG12
  description: string;
  owner?: string;
  dueDate?: string;
  status: NextActionStatus;
  priority: NextActionPriority;
  dateCompleted?: string;
}

// Immutable audit record of a backtrack (confirmed rule B4 — "no silent
// corrections"): approvals/decisions are invalidated on the live records but
// their pre-backtrack values are preserved here, never deleted.
export interface BacktrackEvent {
  id: string;
  date: string;
  initiatedBy?: string;
  reason?: string;
  fromGateId: string;
  toGateId: string;
  reopenedGateIds: string[];
  previousGates: GateRecord[]; // snapshot of the affected gates before reset
  previousSignOffs: Record<number, SignOff[]>; // snapshot of un-approved phase sign-offs
}

// Per-market regulatory/launch tracking for Gates 10-12 (confirmed rule A1).
// Launch approval is hard-blocked until the market's PIF status is Approved
// (confirmed rule C5).
export type MarketApprovalStatus = 'Not Started' | 'In Progress' | 'Approved' | 'Blocked' | 'N/A';

export interface MarketTrack {
  market: string;
  pifStatus: MarketApprovalStatus;
  regulatoryStatus: MarketApprovalStatus;
  claimsApproval: MarketApprovalStatus;
  launchApproval: MarketApprovalStatus;
  regulatoryNotes?: string;
  pifApprovedDate?: string;
  launchApprovedDate?: string;
}

// ---------------------------------------------------------------------------
// Integrations (decision A3): MBc360 integrates with specialist systems rather
// than replacing them. Cosmetri is read-only master data via its API; the demo
// simulates the connection — a production build must exchange credentials
// through a backend proxy, never from the browser.
// ---------------------------------------------------------------------------

export interface CosmetriConnection {
  baseUrl: string;
  username?: string; // password is never persisted — only used to request tokens
  connected: boolean;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  lastSyncAt?: string;
}

export interface PowerAppsSettings {
  // "Create new raw material" change-request app: request -> approval ->
  // entered in Cosmetri -> available via the API (decision F12/d).
  newRawMaterialUrl: string;
}

export interface GraphSettings {
  tenantId?: string;
  clientId?: string;
  sharepointSiteUrl?: string;
  rawMaterialListName?: string;
}

export interface IntegrationSettings {
  cosmetri: CosmetriConnection;
  powerApps: PowerAppsSettings;
  graph: GraphSettings;
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
  nextActions: NextAction[]; // controlled per-gate follow-up actions (rule B2)
  backtrackEvents: BacktrackEvent[]; // immutable backtrack audit log (rule B4)
  marketTracks: MarketTrack[]; // per-market Gate 10-12 tracking (rules A1/C5)
  studyApprovals: StudyApproval[]; // dedicated study approval workflow (rule C2)
  formulaVersion: string; // current formula version, e.g. "F1.0" (rule A2)
  formulaVersionHistory: FormulaVersionRecord[]; // prior versions, audit history (rule A2)
}
