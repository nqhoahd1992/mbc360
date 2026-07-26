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

// Audit trail for ordinary Phase Gate Flow edits (status/decision/owner/due
// date/evidence link/notes) — every field a save actually changes gets its
// own immutable entry (who, when, old value, new value). Deliberately
// separate from BacktrackEvent: a backtrack is its own richer, specialized
// event (reopened range + snapshots + invalidated sign-offs) and is not
// duplicated here.
export interface GateFieldChange {
  field: keyof Omit<GateRecord, 'gateId'>;
  from?: string;
  to?: string;
}

export interface GateChangeLogEntry {
  id: string;
  gateId: string;
  date: string;
  changedBy?: string;
  changes: GateFieldChange[];
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

// A single free-text "next action" field used to live here, but rule B2
// (confirmed) overturned that assumption: next actions are their own
// controlled, multi-record list per gate — see NextAction / ProjectData.nextActions.
export interface PhaseClosure {
  evidenceSummary?: string;
  signOffs: SignOff[];
  angles: AngleRow[];
  // F13 / B5: pre-work (data entered before the phase formally opened) is
  // allowed, but once the phase opens the responsible owner must review and
  // accept it before it contributes to completion. This records that acceptance.
  preWork?: { acceptedBy?: string; acceptedDate?: string };
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
  methodRef?: string;
  notes?: string;
  // Set by the Cosmetri import (never by manual entry) — Cosmetri's own
  // composition/supplier/identity fields become read-only on this line, since
  // corrections belong in Cosmetri, not a silent local edit (A3, read-only).
  // functionRole and costPerKg stay editable either way (MBc360-side entries).
  fromCosmetri?: boolean;
  // F14: a manually-entered line is "Draft - Not Reconciled with Cosmetri"
  // until reconciled against a controlled Cosmetri formula. Manual lines must
  // be reconciled before Gate 7 final safety approval, and Gates 10/11 must use
  // the controlled Cosmetri formula. A `fromCosmetri` line is inherently
  // reconciled; a manual line needs this flag set.
  reconciled?: boolean;
  // Human-readable Cosmetri identity ("{trade name} | {code}", matching how
  // Cosmetri's own UI labels a raw material), captured once at import time
  // (CosmetriImportModal) or pick time (the raw-material picker in
  // BomCosting) — NOT re-derived from a live catalogue fetch on every render,
  // so it stays correct even if that fetch is incomplete/unavailable later.
  // `rmCode` (`RM-{Cosmetri numeric id}`) remains the internal join key; this
  // is what a human should actually see.
  rmDisplayName?: string;
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
  // F5: the Major-change criteria the initiator selected (ids from
  // MAJOR_CHANGE_CRITERIA) and the reviewer who confirmed the classification.
  majorCriteria?: string[];
  classificationConfirmedBy?: string;
  // Formula BOM exactly as it stood at `previousVersion`, captured at the
  // moment of this version bump — lets the UI show/compare an old version's
  // composition later. Absent on history entries created before this field
  // existed. The CURRENT version's BOM is never snapshotted here — it's just
  // `ProjectData.bom` (still live/editable).
  previousBomSnapshot?: BomLine[];
}

// Controlled follow-up action attached to a gate (confirmed rules B2 + F8).
// Open actions block a plain "Proceed" pass — they may stay open only under a
// "Proceed with Conditions" decision. A **Critical** action blocks normal gate
// closure even under Proceed with Conditions (F8; consistent with F7's rule
// that critical gaps force Hold/Backtrack/Reject). "Open" for blocking purposes
// means any status other than the two terminal ones (Closed / Cancelled).
export type NextActionStatus =
  | 'Open'
  | 'In Progress'
  | 'Awaiting Information'
  | 'Ready for Verification'
  | 'Closed'
  | 'Cancelled';
export type NextActionPriority = 'Low' | 'Medium' | 'High' | 'Critical';

// Terminal statuses — an action in one of these no longer blocks a gate.
export const NEXT_ACTION_TERMINAL_STATUSES: NextActionStatus[] = ['Closed', 'Cancelled'];

export interface NextAction {
  id: string;
  gateId: string; // SG01..SG12
  description: string;
  owner?: string; // responsible for COMPLETING the action (F8)
  dueDate?: string;
  status: NextActionStatus;
  priority: NextActionPriority;
  dateCompleted?: string;
  // F8: the action owner may not unilaterally verify closure where independent
  // confirmation is required — the raiser / gate owner / an authorised reviewer
  // verifies and closes it. `raisedBy`/`verifiedBy` record that trail; the
  // owner ≠ verifier authorisation itself is enforced once real roles land (F6).
  raisedBy?: string;
  verifiedBy?: string;
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
// than replacing them. Cosmetri is read-only master data via its API.
//
// The Cosmetri connection itself (base URL, tokens, refresh state) is NOT
// modeled here: it's a single org-wide server-held credential, never the
// browser's business (A3) — see apps/api/src/cosmetri/. The frontend only
// ever reads its status from GET /api/integrations/cosmetri/status.
// ---------------------------------------------------------------------------

export interface PowerAppsSettings {
  // "Create new raw material" change-request app: request -> approval ->
  // entered in Cosmetri -> available via the API (decision F12/d).
  newRawMaterialUrl: string;
}

// Tenant/client identity is NOT recorded here: the app registration used for
// Graph calls is the same one already configured server-side for Entra ID
// sign-in (AUTH_TENANT_ID / AUTH_CLIENT_ID in apps/api/.env, see auth.service.ts)
// — extended with Graph scopes (e.g. Sites.Read.All) when this sync is built,
// not a second app entered per-browser-session. Only non-identity, per-sync
// settings live here.
export interface GraphSettings {
  sharepointSiteUrl?: string;
  rawMaterialListName?: string;
}

export interface IntegrationSettings {
  powerApps: PowerAppsSettings;
  graph: GraphSettings;
}

// Change-control lifecycle status (confirmed rule F9). "Open" statuses soft-lock
// the gates the change affects; the four terminal states are treated as closed
// once a final disposition is recorded. (See isChangeOpen / CHANGE_CLOSED_STATUSES
// in config/changeTriggers.ts.)
export type ChangeStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved - Implementation Pending'
  | 'In Implementation'
  | 'Verification Pending'
  | 'On Hold'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled'
  | 'Superseded';

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
  status: ChangeStatus;
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
  // Per-project review owners / co-signers, keyed by REVIEW_ROLES[].key (see
  // packages/shared/src/config/reviewers.ts). Entered (all required) on the
  // Create New Project form; each page composes its "Review owner · Co-sign: …"
  // caption from these via composeReviewOwner(). Replaces the old hardcoded
  // demo-name strings that used to live in config.
  reviewers: Record<string, string>;
  // Set while the project is archived (2026-07-26). Archiving is reversible and
  // hides the project from the default list; only a role holding
  // `project|archive` may set it. Absent = active.
  archived?: { at: string; by?: string };
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
  gateChangeLog: GateChangeLogEntry[]; // immutable log of ordinary Phase Gate Flow field edits
  marketTracks: MarketTrack[]; // per-market Gate 10-12 tracking (rules A1/C5)
  studyApprovals: StudyApproval[]; // dedicated study approval workflow (rule C2)
  formulaVersion: string; // current formula version, e.g. "F1.0" (rule A2)
  formulaVersionHistory: FormulaVersionRecord[]; // prior versions, audit history (rule A2)
}
