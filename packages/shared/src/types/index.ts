// Generic work-item status, used by Requirement / Evidence / Change / CAPA rows.
export type WorkStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Backtracked';
// A requirement row may additionally be dispositioned 'N/A' where its section
// declares `allowNotApplicable` (Round 4 question 21, 2026-08-29). Kept OUT of
// `WorkStatus` itself: that type is shared with Evidence / Change / CAPA rows,
// and widening it there would silently offer a disposition nobody asked for on
// three other tables.
export type RequirementStatus = WorkStatus | 'N/A';

// Gate "Stage status" — matches the real MBc360 workbook dropdown exactly
// (Not Started, In Progress, Complete, Gap, Hold, N/A).
export type StageStatus = 'Not Started' | 'In Progress' | 'Complete' | 'Gap' | 'Hold' | 'N/A';

// Gate "Gate decision" — matches the real MBc360 workbook dropdown exactly
// (Proceed, Proceed with Conditions, Hold, Backtrack, N/A). Also reused for the
// phase closure sign-off Decision column, which uses the same list in the source file.
export type GateDecision = 'Proceed' | 'Proceed with Conditions' | 'Hold' | 'Backtrack' | 'N/A';

export type YNNA = 'Y' | 'N' | 'NA';

// The company's one severity scale (Round 4 questions 3, 33(a) and 34(a), all
// 2026-08-24). Three separately-asked questions returned the same four levels, and
// all three said the same thing about the top one: "Critical remains a distinct
// level above High" — so folding Critical into High, which `changeImpact.ts` used
// to do, was wrong.
//
// Before this the repo held THREE copies of the idea: this type at three levels,
// `SAFETY_FINDING_SEVERITY_OPTIONS` as a second three-level list, and the various
// two-value Open/Closed lists. One scale now, defined once.
//
// `CapaRecord.severity` shares the type and therefore gains `Critical` as well.
// No answer asked for that, and it is disclosed rather than silent: it changes no
// rule (no readiness check reads CAPA severity — verified) and the alternative was
// a fourth private vocabulary, which is the exact problem this consolidation
// exists to remove.
export const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// Graded blocking (question 33 for safety findings, question 3 for gaps, question
// 34 for change controls). The three answers agree on the shape: the top two
// levels stop a gate outright, `Medium` may be carried under Proceed with
// Conditions when formally accepted and controlled, and `Low` warns.
export const RISK_LEVELS_HARD_BLOCKING: readonly RiskLevel[] = ['Critical', 'High'];

// Round 4 question 3 (2026-08-24), which also closes Round-2 A1 — the general
// definition of "critical" that had been open since 21 July.
//
// "A gap must carry its own formal criticality assessment… Criticality is assessed
// by a suitably qualified reviewer, not decided informally during the
// gate-decision step." That last clause is the whole point: a `Gap` status used to
// block a plain Proceed and allow Proceed with Conditions, with nothing anywhere
// recording HOW serious the gap was — so the seriousness was decided implicitly,
// by whoever picked the decision, and left no trace.
export const GAP_IMPACT_CATEGORIES = [
  'Safety',
  'Regulatory',
  'Claims',
  'Quality',
  'Efficacy',
  'Release',
  'Commercial',
  'Other',
] as const;

// ---------------------------------------------------------------------------
// Company-level controlled reference data (Round 4 questions 4, 17 and 28 —
// 2026-08-24).
//
// These shapes live here, in the canonical data model, rather than beside the
// rules that read them, because `ProjectData.reference` below carries them and
// this file imports nothing — see the note there for why a project holds a
// resolved copy at all. The RULES about them (who may edit, the enhanced-PMS
// condition list, the review schedule, the risk-flag predicates) stay in
// `config/referenceData.ts`, which re-exports these types so a caller reading
// about reference data has one place to import from.
// ---------------------------------------------------------------------------

// Round 4 question 4. What Regulatory records per market — "whether each market
// requires particular adverse-event reporting, PMS records or review intervals" —
// plus the two fields other answers need from the same place: question 35(b)'s
// required dossier type, and question 27's per-market claim restriction.
export interface MarketProfile {
  id: string;
  market: string;
  adverseEventReporting: boolean;
  pmsRecordsRequired: boolean;
  // Months. Undefined means "use the company default schedule" from question 13
  // (1 / 3 / 12 then annually), NOT "no review" — every marketed product needs a
  // baseline review, so absence can never mean none.
  reviewIntervalMonths?: number;
  // One of question 4's fourteen enhanced-review conditions is "market-specific
  // vigilance requirement". This is that flag, set by Regulatory per market.
  enhancedSurveillance: boolean;
  dossierType?: string;
  claimRestrictions?: string;
  evidenceLink?: string;
  reviewDate?: string;
  notes?: string;
  revision: number;
  updatedBy?: string;
  updatedAt?: string;
}

// Round 4 question 17 (2026-08-24). The eleven risk classifications, transcribed
// verbatim from the answer's own list.
export const RM_RISK_FLAGS = [
  'Fragrance',
  'Essential oil',
  'Botanical extract',
  'Protein',
  'Known allergen',
  'Residual-solvent risk',
  'Heavy-metal risk',
  'Microbiological risk',
  'Restricted impurity',
  'Processing residue',
  'Variable natural-source composition',
] as const;
export type RmRiskFlag = (typeof RM_RISK_FLAGS)[number];

// One material's entry in the shared Raw Material Risk Overlay.
//
// "This is not a second raw-material master. It stores only MBc360-specific risk
// classifications the API does not expose." Hence OVERLAY: keyed to the Cosmetri
// raw-material id, holding nothing Cosmetri already provides — no trade name, no
// supplier, no INCI. If Cosmetri ever exposes these fields, the answer says the
// overlay migrates there, and keying it this way is what makes that possible.
//
// Why this is not a per-project column: we reported to the team ourselves that a
// per-project version would be "the most repetitive data-entry burden in anything
// discussed so far" — whether a material contains essential oils does not change
// from project to project. The answer agreed: "Do not re-enter this per project."
export interface RawMaterialRisk {
  id: string;
  // `RM-{Cosmetri numeric id}` — the same key `BomLine.rmCode` and the Supplier &
  // RM Evidence register already use, so the overlay joins to a material by the
  // identifier the app already carries rather than by trade name (which the
  // Cosmetri join is known to get wrong or blank — see the A3 notes in CLAUDE.md).
  rmCode: string;
  // Kept for the human reading the admin table. Display only: the authority on
  // what this material IS remains Cosmetri, per the read-only rule A3.
  displayName?: string;
  // An entry with an EMPTY list is a real answer — "assessed, no risk flag" — and
  // is not the same as having no entry at all, which means nobody has classified
  // the material. The Gate 4 trigger depends on that distinction.
  flags: RmRiskFlag[];
  evidenceLink?: string;
  reviewDate?: string;
  notes?: string;
  revision: number;
  updatedBy?: string;
  updatedAt?: string;
}

// The company reference data a rule may need while evaluating one project.
//
// Why a project carries this at all: the rule engine in `utils/gateProgress.ts` is
// a set of pure functions over `ProjectData`, called from ~50 places in the web app
// and from every server-side guard. Two Round 4 answers put company data inside
// those rules (question 17's risk overlay at Gate 4, question 4's market
// restriction in C1), so the engine needs to see it. Threading a second argument
// through every call site would have been the alternative; resolving it once, where
// both sides of the join are available, and handing the engine one object keeps the
// functions pure and the signatures unchanged.
//
// It is a READ-ONLY snapshot, filled by the API when it maps a project and
// refreshed on every read. No store action writes it, and it is deliberately not
// somewhere a project can edit — question 28's "projects read from the library but
// do not directly edit it" applies to all three datasets.
// Deliberately NOT narrowed to the project's own markets and materials on the way
// in. Every rule that reads these already does its own filtering
// (`marketRestrictsClaims` by market, `rmCodesWithRiskFlags` by rmCode), and a
// second narrowing step at load time would be a second copy of the same join to
// keep correct — one of which would eventually be wrong. Both tables are
// company-scale, so there is nothing to gain by pre-filtering.
export interface ProjectReferenceData {
  marketProfiles: MarketProfile[];
  // The overlay. An rmCode the project uses that is ABSENT here has not been
  // classified — which is not the same as carrying no risk.
  rmRisk: RawMaterialRisk[];
}

export interface GateRecord {
  gateId: string; // SG01..SG12
  status: StageStatus;
  decision?: GateDecision;
  owner?: string;
  dueDate?: string;
  evidenceLink?: string;
  notes?: string;
  // The eight fields question 3 lists, all only meaningful while `status` is
  // 'Gap'. They live on the gate record rather than in a register because a gap
  // IS a state of the gate, not an item someone adds — there is exactly one per
  // gate, and it appears and disappears with the status.
  //
  // `gapCriticality` empty means NOT ASSESSED, and that blocks: question 3 says
  // the assessment is a reviewer's act, so an unassessed gap cannot inherit the
  // old permissive behaviour. Same principle as question 7.
  gapCriticality?: RiskLevel;
  gapImpactCategory?: string;
  gapAssessor?: string;
  gapAssessmentDate?: string;
  gapRationale?: string;
  gapEvidenceLink?: string;
  gapRequiredAction?: string;
  gapActionOwner?: string;
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
  // Round 4 question 22(b), 2026-08-29: on a section declaring `requiresPrimary`
  // exactly one SELECTED option must carry this. Named `isPrimary` rather than
  // `primary` only because PRIMARY is a reserved word in SQL and the column
  // would need quoting everywhere it appears.
  isPrimary?: boolean;
  evidenceLink?: string;
  notes?: string;
}

export interface RequirementItem {
  gate: string;
  requirement: string;
  // Phase 1 only (2026-08-09, SME Round 3 B6). Optional rather than a separate
  // type: the difference from Phases 2-4 is one column, and this repo's rule is
  // to drive columns from config rather than fork the table. Values reuse the
  // NextAction priority vocabulary confirmed under F8 — B6 asks for a priority
  // column but names no values, and reusing an already-confirmed list seemed a
  // much weaker assumption than inventing one.
  //
  // Round 4 question 21(a) (2026-08-24) rejected that reuse — "criticality
  // remains a risk concept, not a requirements-priority value" — so the values
  // are REQUIREMENT_PRIORITIES (Must / Should / Could) since 2026-08-29. Still a
  // plain string rather than a union: Phases 2-4 rows carry no priority at all,
  // and a union would invite a non-null assertion at every read site.
  priority?: string;
  // Phase 1 only (2026-08-11). B6's own shape is "category, requirement,
  // priority, owner and notes": the 16 rows the team listed ARE the categories,
  // so `requirement` above holds the CATEGORY and this holds what that category
  // means for this project. Until now there was nowhere to write it, and it was
  // being typed into Notes, which then did double duty.
  requirementText?: string;
  minimumRequirement: string;
  rationale: string;
  owner: string;
  status: RequirementStatus;
  // Why this row is not applicable to this project. Required (and only shown)
  // when `status === 'N/A'` on a section declaring `allowNotApplicable`; a plain
  // free-text field of its own rather than a convention inside `notes`, which
  // was already doing double duty once before (see `requirementText`).
  naRationale?: string;
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

// D1 (2026-08-07): a sign-off is an authenticated ACT, not a typed name. Every
// signature records the six fields D1 names — authenticated user, the role that
// user held at the moment of signing, date/time, decision, the record version
// the signature attests to, and a comment where required.
//
// Everything below `comments` is written by the SERVER from the session and the
// locked project row; a client cannot set any of it, and `name`/`initials` (the
// workbook's own two columns) are DERIVED from the signer's account rather than
// typed — before this they were free text, so a row could name one person while
// the session recorded another.
export interface SignOff {
  role: SignOffRole;
  // Who the project's Lead nominated to sign this row. Only that person may
  // sign it — see `signSignOff` in apps/api/src/projects/projects.service.ts.
  assignedToUserId?: string;
  assignedToName?: string;
  name?: string;
  initials?: string;
  date?: string;
  decision?: string;
  comments?: string;
  signedByUserId?: string;
  signedAt?: string; // ISO timestamp, server clock
  roleAtSigning?: string; // role label(s) held when signed — NOT re-read later
  recordVersion?: number; // projects.version the signature attests to
  // Saved-signature + email step-up (2026-08-21): a snapshot of the signer's
  // saved signature image AT THE MOMENT OF SIGNING — never a live reference,
  // same principle as roleAtSigning/recordVersion above. Both stay undefined
  // on the common path (no image attached).
  signatureImage?: string;
  signatureVerifiedAt?: string; // ISO timestamp — set only when the email step-up succeeded for this act
}

export function isSignedOff(signOff: SignOff | undefined): boolean {
  return !!(signOff?.signedByUserId && signOff.signedAt);
}

// Register closing (2026-08-27). Two roles, same authenticated-signature
// shape as SignOff — but no `assignedToUserId`/`assignedToName`: unlike a
// phase sign-off (which needs the project's Lead to nominate a signer), the
// signer here is derived directly from the register's own ReviewOwnerSpec
// (owner.role for "Review owner", coSign[0]?.role — or Project Manager if
// none — for "Co-sign"), the same resolution composeReviewOwner() already
// uses for the on-screen caption.
export type RegisterClosureRole = 'Review owner' | 'Co-sign';

export interface RegisterClosureSignOff {
  role: RegisterClosureRole;
  name?: string;
  signedByUserId?: string;
  signedAt?: string; // ISO timestamp, server clock
  roleAtSigning?: string;
  recordVersion?: number;
  signatureImage?: string;
  signatureVerifiedAt?: string;
}

export interface RegisterClosureState {
  signOffs: RegisterClosureSignOff[]; // 0-2 rows; missing role = not yet signed
}

export function isRegisterClosureSigned(signOff: RegisterClosureSignOff | undefined): boolean {
  return !!(signOff?.signedByUserId && signOff.signedAt);
}

// Closed = BOTH roles signed. A register with no RegisterClosureState at all
// (not yet scaffolded, or a register with no specific gate — see
// gateRefHighestGateId) is never closed.
export function isRegisterClosed(state: RegisterClosureState | undefined): boolean {
  if (!state) return false;
  const owner = state.signOffs.find((s) => s.role === 'Review owner');
  const coSign = state.signOffs.find((s) => s.role === 'Co-sign');
  return isRegisterClosureSigned(owner) && isRegisterClosureSigned(coSign);
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
  // Links recorded against this phase's banner shortcuts, keyed by the workbook's
  // own label (`PhaseKeyLinkConfig.label`). Only the shortcuts with no in-app
  // equivalent are stored — the workbook prints "(provide link here)" under each
  // of the four, and for the rest this app IS the destination.
  keyLinks?: Record<string, string>;
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
  // Round 4 question 36(b), 2026-08-29: "Add a status field to the costing
  // screen", with four supporting fields beside it. Until this, every number
  // above was pre-filled at project creation, so nothing on this screen could
  // distinguish "costed" from "never opened" — which is why the Gate 5 item that
  // reads it had stayed `manual` since the readiness engine was built.
  //
  // COSTING_FEASIBILITY_STATUSES; optional because existing projects predate it.
  feasibilityStatus?: string;
  assessor?: string;
  // 'YYYY-MM-DD'.
  reviewDate?: string;
  // "Assumptions or conditions" — also where the rationale goes when the status
  // is 'N/A — rationale required'.
  assumptions?: string;
  // "Evidence or costing-version link."
  evidenceLink?: string;
}

// Properties of the formula itself that gate readiness has to reason about,
// as opposed to its composition (BomLine) or its cost (CostingInputs). Kept as
// its own singleton so a future trigger needing another formula property has an
// obvious home rather than widening CostingInputs.
//
// Project-level, not per formula version: a version-specific value would need
// the readiness engine to know which version it is evaluating, which it does
// not today. Worth revisiting alongside the per-market work.
// Explicit assessment answers (Round 4 questions 8, 9, 11 and 12, 2026-08-24).
//
// All four exist for the same reason — question 7's rule that "a missing
// assessment must never be treated as meaning the condition does not apply". Each
// records a judgement that the app was previously inferring from other data, so
// that "not yet assessed" becomes a state a person can see and the engine can
// block on, rather than a silent pass.
//
// The three option lists are deliberately NOT unified into one enum. The reply
// writes them differently — "Pending assessment" for questions 8 and 12,
// "Undecided" for question 9, and question 11 offers only Yes/No — and this repo
// transcribes controlled values verbatim rather than tidying them. An empty string
// is the fourth, unwritten answer in every case: nobody has answered yet.
//
// Kept as one object beside `FormulaProperties` rather than four scattered fields:
// they share a lifecycle (a person answers them, the engine reads them) and a
// single `PUT :id/assessments` route serves all four.
export const CHANGE_CONTROL_REQUIRED_OPTIONS = ['Yes', 'No', 'Pending assessment'] as const;
export const HUMAN_STUDY_PLANNED_OPTIONS = ['Yes', 'No', 'Undecided'] as const;
export const ADMINISTRATIVE_ONLY_OPTIONS = ['Yes', 'No'] as const;
export const SCALE_UP_RISK_OPTIONS = ['Yes', 'No', 'Pending assessment'] as const;

// Round 4 question 25(c), 2026-08-29: "Family use does not automatically mean a
// vulnerable population, but must prompt confirmation of the actual age groups
// included; if infants or young children are included, the relevant pathway
// activates."
//
// So this is a QUESTION, not a mapping — which is why `Family use` is still absent
// from TARGET_USER_TO_VULNERABLE_GROUP. The values reuse the Gate 02 target-user
// vocabulary rather than inventing an age scale, so "family use includes infants"
// and "Infant 0+ is a target user" mean the same thing to the engine.
export const FAMILY_USE_AGE_GROUPS = ['Infant 0+', 'Child 2+', 'Child 3+', 'Adults only'] as const;

// Per-gate sign-off (Round 4 questions 18 and 29, built 2026-08-29). Distinct
// from the PHASE-level `SignOff`, which stays: question 29's answer describes the
// gate act, and D1 says the phase block "remains as an additional phase-closure
// approval and is not replaced".
//
// Three roles per gate, in sequence — "Preparer confirms the record is complete
// and recommends a decision · Reviewer confirms the evidence and records a
// recommendation · Approver records the final gate decision", and "the approver's
// decision IS the gate decision".
export const GATE_SIGNOFF_ROLES = ['Prepared by', 'Reviewed by', 'Approved by'] as const;
export type GateSignOffRole = (typeof GATE_SIGNOFF_ROLES)[number];

export interface GateSignOff {
  gateId: string;
  // Question 18: Gates 10, 11 and 12 are signed PER MARKET, because each market
  // may differ in dossier status, regulatory decision, claims, artwork, formula
  // version and launch date. Absent on every other gate — deliberately nullable
  // rather than a placeholder value, so the two shapes stay visibly different.
  market?: string;
  role: GateSignOffRole;
  // Nominated signer (the project Lead nominates; only that person may sign),
  // stored as the user id because this one is an authorisation input.
  assignedToUserId?: string;
  assignedToName?: string;
  signedByUserId?: string;
  name?: string;
  initials?: string;
  signedAt?: string;
  roleAtSigning?: string;
  decision?: GateRecord['decision'];
  comment?: string;
  signatureImage?: string;
  signatureVerifiedAt?: string;
  // Question 29(1): the gate-scoped evidence snapshot this signature attests to.
  // Held in full rather than hashed, because the answer requires the system to
  // "identify what changed" — a hash can only say that something did.
  snapshot?: GateEvidenceSnapshot;
}

// The eight components question 29(1) lists, in its own order. Everything here is
// derived from ProjectData by `gateEvidenceSnapshot()`; nothing is entered.
export interface GateEvidenceSnapshot {
  gateId: string;
  market?: string;
  status: string;
  // NOT the gate record's `decision`. That field is the OUTPUT of the sign-off —
  // question 29(5) makes the approver's decision the gate decision — so including
  // it would mean the act of approving changed the snapshot the preparer and
  // reviewer signed, making both stale the instant the gate was approved and the
  // gate permanently unsignable: approve, all three go stale, re-sign, approve,
  // stale again. The answer's "gate status and proposed decision" is still
  // recorded: each signature carries its own `decision`, which is precisely the
  // recommendation that role made [ASSUMPTION: R5-Q7].
  // The Key Gate Check rows belonging to this gate.
  gateChecks: { check: string; done: boolean; ynna: string; notes?: string }[];
  // "Applicable checklist results" — the checklist sections and requirement rows
  // this gate owns, each reduced to a stable string.
  //
  // Captured as EVIDENCE rather than as the readiness engine's verdict on it, and
  // that is not a stylistic choice: a snapshot containing the readiness list would
  // contain the sign-off item itself, so evaluating "is this gate signed off"
  // would have to evaluate a snapshot that contains the answer to that question.
  // Reading the underlying records directly breaks the loop and is closer to what
  // question 29(1) actually names.
  checklists: Record<string, string>;
  requirements: Record<string, string>;
  // "Evidence links and document revisions" — the gate row's own evidence link
  // plus every register row this gate reads, reduced to a stable string.
  evidenceLinks: string[];
  registers: Record<string, string>;
  // "Open actions and conditions".
  openActions: { id: string; title: string; status: string; priority: string }[];
  formulaVersion: string;
  artworkVersion?: string;
}

export interface ProjectAssessments {
  // Question 8 — "Change Control required?", with the five supporting fields the
  // answer lists. Held at PROJECT level, not per finding, because the app has no
  // per-finding record to hang it on: `postMarketSources` is a checklist of which
  // sources apply and `capa` records are the resulting actions, neither of which is
  // "the finding". Blocking Gate 12 is the nearest faithful reading of "must block
  // closure of the post-market finding", since Gate 12 IS the post-market review
  // closure — but the granularity is ours, not theirs [ASSUMPTION: R5-Q11].
  changeControlRequired?: string;
  changeControlReviewer?: string;
  changeControlReviewDate?: string;
  changeControlRationale?: string;
  // Required when the answer is Yes: "a valid Change Control record must be linked".
  changeControlRecordId?: string;
  changeControlEvidenceLink?: string;
  // Question 9 — set to 'Yes' automatically when a Study Protocol is started, per
  // "Creating a Study Protocol automatically sets the answer to Yes"; a person can
  // still answer it directly before that.
  humanStudyPlanned?: string;
  // Question 11 — "The classification must be confirmed by an authorised
  // reviewer", so the answer alone is not enough; both fields are needed before
  // the competitor-review exemption applies.
  administrativeOnly?: string;
  administrativeOnlyConfirmedBy?: string;
  // Question 12 — the scale-up trigger Gate 9 has never had.
  scaleUpRiskIdentified?: string;
  scaleUpRiskDescription?: string;
  scaleUpRiskAssessor?: string;
  scaleUpRiskAssessmentDate?: string;
  scaleUpRiskRationale?: string;
  scaleUpRiskActivity?: string;
  scaleUpRiskEvidenceLink?: string;
  // Question 25(c) — which age groups a "Family use" product is actually for.
  // Comma-joined subset of FAMILY_USE_AGE_GROUPS; empty means nobody has
  // confirmed, which is what makes the infant trigger return `notAssessed`
  // rather than quietly deciding that a family product excludes infants.
  familyUseAgeGroups?: string;
  familyUseConfirmedBy?: string;
  familyUseConfirmedDate?: string;
}

// The recorded family-use age groups, as a list. Empty means unanswered.
export function familyUseAgeGroupList(assessments: ProjectAssessments): string[] {
  return (assessments.familyUseAgeGroups ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '');
}

export interface FormulaProperties {
  // MICROBIOLOGICAL_SUSCEPTIBILITY_OPTIONS. Empty until someone records it.
  microSusceptibility?: string;
  // Required by A3 whenever the answer is anything but 'Susceptible'.
  microRationale?: string;
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
//
// ⚠️ Round 4 question 2 (2026-08-24) gives a version a real lifecycle this shape
// cannot hold: Active · Transition Approved · Transition in Progress · Superseded
// · Withdrawn · Cancelled. Approving a replacement moves the old version to
// **Transition in Progress**, NOT Superseded; it becomes Superseded only after an
// authorised person confirms ten things **for the relevant market** — and "the
// supersession decision must be recorded by a person, never inferred
// automatically by the system". Those ten facts span Regulatory, Quality, Supply
// Chain, Sales & Marketing and Packaging, so whether that is one signature or a
// multi-role block is not settled [ASSUMPTION: R5-Q8] [R4-REWORK: câu 2].
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
export const NEXT_ACTION_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type NextActionPriority = (typeof NEXT_ACTION_PRIORITIES)[number];

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
// Runtime list as well as a type, so a register column can offer these values
// (rule E2's per-market Regulatory approval) without a second copy going stale.
export const MARKET_APPROVAL_STATUSES = ['Not Started', 'In Progress', 'Approved', 'Blocked', 'N/A'] as const;
export type MarketApprovalStatus = (typeof MARKET_APPROVAL_STATUSES)[number];

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
  // Rule E3(b): "Gate 11 requires more than a duplicate warning. It must evaluate
  // the impact classification and closure status of each open Change Control."
  // Neither riskLevel (Low/Medium/High) nor the free-text affectedArea is that
  // classification, so this holds it — values are E3(b)'s own list of impacted
  // subjects (see CHANGE_IMPACT_AREAS). Several may apply at once.
  impactAreas?: string[];
  requiredAction?: string;
  evidenceLink?: string;
  requiredSignOffs?: string;
  communicationRequired: boolean;
  salesMarketingMessage?: string;
  dueDate?: string;
  status: ChangeStatus;
  // Round 4 question 34(c) (2026-08-24): "A closing date or short note alone is
  // insufficient. Final disposition includes: Final status · Outcome · What was
  // implemented or why no implementation was required · Verification evidence ·
  // Impacted formula/artwork/claim/market versions · Responsible verifier ·
  // Closure date · Remaining action or transition requirement, if any."
  //
  // Three of the eight already existed — `status` is the final status,
  // `closureEvidence` is the verification evidence, `closedDate` is the closure
  // date. `isChangeDispositionRecorded` used to accept ANY ONE of the last two,
  // which is exactly the "closing date alone" the answer rejects. The five below
  // are new; all are needed before a terminal status stops blocking Gate 11.
  closureEvidence?: string;
  closedDate?: string;
  closureOutcome?: string;
  closureImplementation?: string;
  closureImpactedVersions?: string;
  closureVerifier?: string;
  // The one field the answer marks optional — "if any" — so it is deliberately NOT
  // required by `isChangeDispositionRecorded`. A change with nothing left to
  // transition should not be blocked into inventing something.
  closureRemainingAction?: string;
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
  // ---------------------------------------------------------------------
  // Gate 1 "Opportunity & Request" capture (2026-08-09, SME Round 3 B1/B2/B3).
  // Deliberately OPTIONAL here and NOT required on the Create New Project form,
  // even though they are Mandatory at Gate 1: the appendix lists them as GATE 1
  // requirements, not creation requirements, and at the opportunity stage some
  // genuinely are not known yet. Making them create-form-mandatory would repeat
  // the sg01-owner mistake — a check that reads a field the form guarantees is
  // vacuously satisfied by construction and can never actually block. Someone
  // must go and fill these in for Gate 1 to pass.
  //
  // CONFIRMED by Round 4 question 20, 2026-08-24: "Current approach is correct —
  // fields optional when the project shell is first created, mandatory before
  // Gate 1 passes." A project may be opened with a temporary name or identifier,
  // creator, date and initial owner; Gate 1 then requires the substantive
  // opportunity and request information. Nothing to change here.
  // ---------------------------------------------------------------------
  // B1 — the requester, kept as separate fields per "the requester's name and
  // department should remain separate fields". Where the request ORIGINATED is
  // NOT here: it is the `requestOrigin` checklist section (gate 01), because an
  // option list belongs in the workbook's option-table shape, with a per-option
  // owner / status / evidence link / rationale a single field cannot hold.
  requesterName?: string;
  requesterDepartment?: string;
  // B2 — the prose half of the "Initial product scope defined" Key Gate Check:
  // proposed product type, intended purpose and the known boundaries of the
  // request. The fourth thing B2 asks for (new development / reformulation /
  // claim change / …) is the `projectNature` checklist section, for the same
  // reason as above plus the trigger that must read it. The checklist-table shape
  // is CONFIRMED by Round 4 question 22(a), and keeping these five free-text
  // fields in their own "Opportunity & Request — Gate 1" block rather than moving
  // them into the Project Identification table is confirmed by 22(e).
  initialScope?: string;
  // B3 — deliberately lightweight and SEPARATE from the Gate 02 target-user /
  // target-market checklists: "These are preliminary fields and do not replace
  // the complete Gate 2 assessment. Gate 2 should confirm, refine and formally
  // approve them." Wiring Gate 1 to the Gate 02 checklists would have forced the
  // team to finish Gate 2's work before Gate 1 could close.
  initialTargetUsers?: string;
  // There is deliberately no `initialTargetMarkets` beside it. Round 4 question
  // 24 (2026-08-24, built 2026-08-29) removed that field: "Use the existing
  // Countries / Markets parameter as the single source of truth." `markets`
  // above therefore stopped being mandatory to create the project shell and
  // became mandatory before Gate 1 passes instead — which is what keeps
  // `sg01-market-user` from being decoration, the exact concern that had put a
  // second free-text field here. `initialTargetUsers` stays: it duplicates
  // nothing, and B3's "preliminary, does not replace Gate 2" reasoning still
  // holds for the user half.
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
  formulaProperties: FormulaProperties;
  assessments: ProjectAssessments;
  evidence: EvidenceItem[];
  capa: CapaRecord[];
  feedback: FeedbackEntry[];
  registers: Record<string, RegisterRow[]>; // keyed by RegisterConfig.key
  // Register closing (2026-08-27) — keyed by RegisterConfig.key, present only
  // for registers with a specific `gate` (gateRefHighestGateId(config.gate)
  // !== undefined). A key missing from this map means "not yet scaffolded /
  // not closeable", same as an empty registers[key] means "no rows".
  registerClosures: Record<string, RegisterClosureState>;
  nextActions: NextAction[]; // controlled per-gate follow-up actions (rule B2)
  // Change Control records for THIS project. Added 2026-08-12 for rule E3(b),
  // which makes Gate 11 evaluate each open change's impact classification — a
  // rule the readiness engine cannot apply to data it cannot see. Until then
  // changes lived only in a global store slice (a leftover from the demo), and
  // the API already loaded them per project without putting them here.
  changes: ChangeRecord[];
  backtrackEvents: BacktrackEvent[]; // immutable backtrack audit log (rule B4)
  gateChangeLog: GateChangeLogEntry[]; // immutable log of ordinary Phase Gate Flow field edits
  marketTracks: MarketTrack[]; // per-market Gate 10-12 tracking (rules A1/C5)
  studyApprovals: StudyApproval[]; // dedicated study approval workflow (rule C2)
  // Per-gate sign-off records (Round 4 questions 18/29). Sparse: a row exists only
  // once somebody has been nominated or has signed, so an absent (gate, market,
  // role) is simply unsigned — which is what the readiness check reads.
  gateSignOffs: GateSignOff[];
  formulaVersion: string; // current formula version, e.g. "F1.0" (rule A2)
  formulaVersionHistory: FormulaVersionRecord[]; // prior versions, audit history (rule A2)
  // Company reference data resolved for THIS project — read-only, refreshed on
  // every read, never written by a store action. See ProjectReferenceData above.
  reference: ProjectReferenceData;
}
