import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  CAPA_STATUSES,
  EVIDENCE_REQUIRED_OPTIONS,
  FEEDBACK_RECOMMEND_OPTIONS,
  FEEDBACK_TOO_OILY_OPTIONS,
  SHEET_STATUSES,
  COMPARTMENT_YNNA,
  COSTING_FEASIBILITY_STATUSES,
  GATES,
  GATE_DECISIONS,
  REQUIREMENT_NOT_APPLICABLE,
  REQUIREMENT_PRIORITIES,
  STAGE_STATUSES,
  WORK_STATUSES,
} from '@mbc360/shared/config/gates';
import { projectStopGrounds, stopRefusal } from '@mbc360/shared/utils/projectStop';
import {
  CHANGE_AFFECTED_AREAS,
  CHANGE_CLOSED_STATUSES,
  CHANGE_IMPACT_AREAS,
  FORMULA_CLASSIFICATION_CAPABILITIES,
  MAJOR_CHANGE_CRITERIA,
  getChangeTrigger,
  isChangeOpen,
  openChangesAffectingGate,
} from '@mbc360/shared/config/changeTriggers';
import { LEAD_ASSIGNABLE_ROLE_KEYS, REVIEW_ROLES, ownerName, registerClosureSignerRole } from '@mbc360/shared/config/reviewers';
import { acknowledgementBasis, holdsRole } from '@mbc360/shared/utils/readinessAck';
import {
  DECISION_OPTIONS,
  NP_APPROVAL_APPROVED,
  NP_APPROVAL_OPTIONS,
  NP_APPROVAL_PENDING,
  REGISTER_CONFIGS,
  applyClaimInheritance,
  createEmptyRegisterRow,
  getRegisterConfig,
  invalidSelectValues,
  assignAutoIds,
  duplicateValueProblems,
  marketScopeProblems,
  missingRequiredProblems,
  signatureColumns,
  signatureFieldKeys,
  type RegisterConfig,
} from '@mbc360/shared/config/registers';
import { diffGateRecord } from '@mbc360/shared/utils/gateDiff';
import {
  mayEditNextActionRecord,
  mayRemoveNextAction,
  nextActionFreezeViolation,
  nextActionRecordChanged,
} from '@mbc360/shared/utils/nextActionAccess';
import { gapBlocksDecision } from '@mbc360/shared/utils/gapCriticality';
import { gate11ConditionalChanges, isChangeDispositionRecorded, missingDispositionFields } from '@mbc360/shared/utils/changeImpact';
import { contradictoryClaimRows, publishedInfoViolations } from '@mbc360/shared/utils/claimEvidence';
import { RM_EVIDENCE_REGISTER, rmEvidenceContradictions } from '@mbc360/shared/utils/rmEvidence';
import { registerAccessReason, registerAccessViolations } from '@mbc360/shared/utils/registerAccess';
import {
  WATCHLIST_REGISTERS,
  brokenNextActionLinks,
  watchlistLabel,
  watchlistRequiredAuthority,
  newlyAcceptingActRows,
  watchlistNamedReviewers,
  newlyNamedReviewerRows,
  WATCHLIST_AUTHORITY_LABEL,
} from '@mbc360/shared/utils/watchlistReview';
import { SAFETY_FINDINGS_REGISTER, droppedSupersessionRecords } from '@mbc360/shared/utils/safetyFindings';
import { bulletList, listMessage, reasonsMessage } from '@mbc360/shared/utils/messageList';
import { SCALE_UP_WAIVER_ROLES, isNewFormula, scaleUpAssessmentProblems } from '@mbc360/shared/utils/scaleUpAssessments';
import {
  VULNERABLE_REGISTER,
  targetUsersPinnedByAssessment,
  vulnerableSaveBlockers,
} from '@mbc360/shared/utils/vulnerableUsers';
import { PHASE_CONFIGS, PRODUCT_FORM_UNDER_EVALUATION } from '@mbc360/shared/config/phases';
import { ASSESSMENT_FIELDS as ASSESSMENT_FIELDS_BY_KEY, ASSESSMENT_HOMES } from '@mbc360/shared/config/assessments';
import { EVIDENCE_AREAS } from '@mbc360/shared/config/evidence';
import { SAFETY_MATRIX_KEY, syncSafetyMatrix } from '@mbc360/shared/utils/safetyMatrixSync';
import { deriveRegisterRows, snapshotWatchlistBasis } from '@mbc360/shared/utils/registerDerived';
import { GATE_READINESS, type ReadinessCheck } from '@mbc360/shared/config/gateReadiness';
import {
  GATE_PASSING_DECISIONS,
  INDEPENDENT_FUNCTION_BY_GATE,
  INDEPENDENT_FUNCTIONS,
  CRITICAL_GATES,
  independentFunctionsForGate,
  representativeMissingReason,
  findGateSignOff,
  gateFlowMissing,
  gateSignOffMarkets,
  gateSignOffNeedsComment,
  isPerMarketGate,
  previousGateSignOffRole,
} from '@mbc360/shared/config/gateSignOff';
import {
  canonicalJson,
  describeGateContentChanges,
  gateEvidenceSnapshot,
  gateSnapshotSignedPart,
} from '@mbc360/shared/utils/gateSnapshot';

import { assessmentMarkets, changeControlAssessmentProblems, isPendingAnswer } from '@mbc360/shared/utils/changeControlAssessments';
import { reviewCycleOptions } from '@mbc360/shared/utils/postLaunch';
import {
  checklistItemKey,
  expandChecklistOptions,
  expandGateChecks,
  expandRequirementRows,
  gateCheckRowKey,
  requirementRowKey,
} from '@mbc360/shared/utils/marketRequirements';
import { changeTriggerAvailability } from '@mbc360/shared/utils/changeAccess';
import {
  CHANGE_STATUSES_NEEDING_TRIAGE,
  CHANGE_TRIAGE_FUNCTION_KEYS,
  TRIAGE_MATERIAL,
  isGateRecordedPassed,
  isTriageRecorded,
  triageProblems,
} from '@mbc360/shared/utils/changeTriage';
import { phaseSignContent } from '@mbc360/shared/utils/phaseSignContent';
import { registerClosureContent, registerRowSignContent } from '@mbc360/shared/utils/registerClosureContent';
import { canDecideGate as canDecideGateInProject, canChangeMarketTracks as canChangeMarketTracksInProject, gateDecisionReason, MARKET_TRACKS_REASON } from '@mbc360/shared/utils/projectAuthority';
import {
  closureKey,
  closureSignersAreNominated,
  registerClosureGateIds,
  registerClosureRoles,
  registerLockViolations,
  registerReviewSpec,
} from '@mbc360/shared/utils/registerClosures';
import { registerContentHashOf, registerRowContentHashOf, rowHashFromCells } from './content-hash';
import { registerRowCells } from '@mbc360/shared/utils/registerClosureContent';
import {
  SUPERSESSION_COORDINATOR,
  SUPERSESSION_FACTS,
  SUPERSESSION_FINAL_CAPABILITY,
  allFactsConfirmed,
  functionsLabel,
  isLegacyConfirmed,
  supersessionFactFilled,
  supersessionGaps,
  versionMarkets,
} from '@mbc360/shared/utils/formulaLifecycle';
import {
  CLAIM_EXEMPTION_CAPABILITY,
  REVISION_APPROVAL_CAPABILITIES,
  frozenRevisionEdits,
  newLinksToWithdrawnWording,
  newRevisionApprovals,
  revisionApprovalForgeries,
} from '@mbc360/shared/utils/claimEvidence';
import {
  currentGateIndex,
  gateBlockers,
  gateIndex,
  gateRefHighestGateId,
  gateSignOffStaleChanges,
  hardGateBlockers,
  isGatePassed,
  gateReadinessChecklist,
  generatedNaEntries,
  registerLockedAsNotApplicable,
  clearRegisterEnteredColumns,
  acknowledgementsVoidedByTargetUsers,
  voidedAcknowledgementsMessage,
  requirementSectionLockedAsNotApplicable,
  isGateRefLocked,
  evaluateTrigger,
  phaseProgress,
  isGateUnlocked,
  phaseCompletionChecklist,
  PHASE_DATA_LOCKED_REASON,
  isPhaseDataLocked,
  gateCheckExemption,
} from '@mbc360/shared/utils/gateProgress';
import {
  ADMINISTRATIVE_ONLY_OPTIONS,
  FAMILY_USE_AGE_GROUPS,
  GAP_IMPACT_CATEGORIES,
  GATE_SIGNOFF_ROLES,
  HUMAN_STUDY_PLANNED_OPTIONS,
  UNSTRUCTURED_PMS_OPTIONS,
  UNSTRUCTURED_PMS_CONDITIONS,
  RISK_LEVELS,
  NEXT_ACTION_TERMINAL_STATUSES,
} from '@mbc360/shared/types';
import type { GateSignedContent, GateSignOffRole, PhaseSignedContent, GateSigningPreview, NextActionStatus, PhaseSignPreview, RegisterClosePreview, RegisterRowSignPreview } from '@mbc360/shared/types';
import type {
  AngleRow,
  ChangeControlAssessment,
  ScaleUpAssessment,
  ChangeRecord,
  ChecklistItem,
  GateCheck,
  GateRecord,
  ProjectData,
  ProjectReferenceData,
  ClaimLibraryEntry,
  RawMaterialRisk,
  RegisterClosureSignOff,
  RegisterRow,
  RequirementItem,
  SignOff,
} from '@mbc360/shared/types';
import { JwtService } from '@nestjs/jwt';
// Value import, not `import type`: `Prisma.DbNull` is a runtime value, needed to
// clear a Json column when a signature is withdrawn.
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../rbac/permissions.service';
import type { SessionUser } from '../auth/session-user';
import { IdempotencyService } from './idempotency.service';
import { IMPACT_DATASET_LABELS, heldMarkets, impactConclusionProblem, impactFunctionsFor, type ImpactDataset } from '@mbc360/shared/utils/impactAssessments';
import { entryTouchesProject, projectHasPassedGate } from '@mbc360/shared/utils/referenceSnapshot';
import { TotpService } from '../verification/totp.service';
import { CosmetriDataService, type CosmetriImportRow } from '../cosmetri/cosmetri-data.service';
import {
  PROJECT_INCLUDE,
  toChangeRecords,
  toGateChangeLog,
  toGateSignOffLog,
  toPhaseSignOffLog,
  toReadinessAckLog,
  toProjectData,
  type ProjectWithAll,
} from './project-mapper';
import { createProjectWithScaffold, type NewProjectInput } from './project-scaffold';

// Writable columns of `ProjectAssessments` (Round 4 questions 8, 9, 11, 12). An
// explicit allowlist rather than `Object.keys(patch)`, so a client cannot smuggle
// an arbitrary column name into the `project.update` data object. `satisfies`
// makes the compiler reject a name that is not a real field on the type, which is
// the typo guard this list would otherwise need a test for.
const ASSESSMENT_FIELDS = [
  'humanStudyPlanned',
  'foreseeableContactRationale',
  'foreseeableContactConfirmedBy',
  'pmsNewActive',
  'pmsNewActiveRationale',
  'pmsNewActiveConfirmedBy',
  'pmsComplaintTrend',
  'pmsComplaintTrendRationale',
  'pmsComplaintTrendConfirmedBy',
  'pmsRecurringIssue',
  'pmsRecurringIssueRationale',
  'pmsRecurringIssueConfirmedBy',
  'pmsSurveillancePlan',
  'pmsSurveillancePlanRationale',
  'pmsSurveillancePlanConfirmedBy',
  'administrativeOnly',
  'administrativeOnlyRationale',
  'administrativeOnlyConfirmedBy',
  'familyUseAgeGroups',
  'familyUseConfirmedBy',
  'familyUseConfirmedDate',
] as const satisfies readonly (keyof ProjectData['assessments'])[];

// The eight gap-assessment columns (Round 4 question 3). Same allowlist discipline
// as ASSESSMENT_FIELDS above, and `satisfies` makes the compiler reject a name that
// is not a real field on GateRecord.
const GAP_ASSESSMENT_FIELDS = [
  'gapCriticality',
  'gapImpactCategory',
  'gapAssessor',
  'gapAssessmentDate',
  'gapRationale',
  'gapEvidenceLink',
  'gapRequiredAction',
  'gapActionOwner',
  'gapLinkedNextActionId',
] as const satisfies readonly (keyof GateRecord)[];

// Round 5 question 10: the triage fields are written by the triage act alone, so a save that omits or alters them is not an edit of them.
const TRIAGE_SERVER_FIELDS: string[] = ['impactTriage', 'triageReason', 'triageBy', 'triageDate', 'confirmedGates'];

// A value the engine compares exactly must be one of its list's values (SME rule
// audit B13, 2026-10-04). A dropdown is only a dropdown in the browser: a direct
// call could store 'critical', 'must' or 'N/A' where the rules look for
// 'Critical', 'Must' or 'Pending assessment', and the rule then reads the wrong
// answer instead of rejecting it. Empty is allowed — it means "not answered".
function assertOneOf(field: string, value: string | null | undefined, allowed: readonly string[]): void {
  const v = (value ?? '').trim();
  if (v !== '' && !allowed.includes(v)) {
    throw new BadRequestException(`${field}: "${v}" is not one of ${allowed.join(' / ')}`);
  }
}

// Whether a gate's readiness config uses a check kind anywhere (through allOf /
// anyOf) — so a rule that belongs to "the gate carrying X" follows the config.
function gateCarries(gateId: string, kind: ReadinessCheck['kind']): boolean {
  const has = (c: ReadinessCheck): boolean =>
    c.kind === kind || ((c.kind === 'allOf' || c.kind === 'anyOf') && c.checks.some(has));
  return (GATE_READINESS[gateId] ?? []).some((r) => has(r.check));
}

// C6 (SME rule audit, 2026-10-04): a field that says WHO confirmed, reviewed or
// assessed something records an act, and an act names the person who did it —
// the reasoning D1 applied to signatures. These were typed names, so anyone could
// put anyone's name there. When such a field is newly set or changed it must be
// the signed-in person; leaving it as it was is always fine. WHO is entitled to
// confirm each of them is a separate question the answers do not settle.
function assertSelfAttested(label: string, before: unknown, after: unknown, actor: string): void {
  const next = typeof after === 'string' ? after.trim() : '';
  const prev = typeof before === 'string' ? before.trim() : '';
  if (next === '' || next === prev) return;
  if (next !== actor) {
    throw new BadRequestException(`${label} records who did it, so it can only be set to yourself (${actor}), not "${next}"`);
  }
}

// The single-answer assessment fields and the list each must come from.
const ASSESSMENT_ANSWER_LISTS: Partial<Record<keyof ProjectData['assessments'], readonly string[]>> = {
  humanStudyPlanned: HUMAN_STUDY_PLANNED_OPTIONS,
  pmsNewActive: UNSTRUCTURED_PMS_OPTIONS,
  pmsComplaintTrend: UNSTRUCTURED_PMS_OPTIONS,
  pmsRecurringIssue: UNSTRUCTURED_PMS_OPTIONS,
  pmsSurveillancePlan: UNSTRUCTURED_PMS_OPTIONS,
  administrativeOnly: ADMINISTRATIVE_ONLY_OPTIONS,
};

// M3 Phase 1 (2026-07-26). Every guard here is the SAME shared pure function the
// browser store calls — never a re-implementation (BACKEND_PLAN §3 principle 1
// and 7: the server is the sole authority, and it must not trust that the UI
// disabled the button).
//
// Concurrency (principle 8): each mutation does its read, guard evaluation and
// write inside ONE transaction, and compares the caller's `expectedVersion`
// against `projects.version` before writing — a stale writer gets 409 rather
// than silently overwriting. Idempotency (principle 9) covers the two POST
// action endpoints.

export interface ProjectListItem {
  id: string;
  productCode: string;
  productSku: string;
  productGroup: string;
  projectLead: string;
  ownerDepartment: string;
  dateOpened: string;
  targetLaunchDate: string;
  markets: string[];
  version: number;
  archivedAt?: string;
  archivedBy?: string;
  stoppedAt?: string;
}

// What every read/write returns: the full ProjectData plus the version the
// client must echo back on its next write.
export interface ProjectEnvelope {
  project: ProjectData;
  version: number;
  // Change Control rows for this project. Outside ProjectData because the store
  // keeps them in a separate global slice.
  changes: ChangeRecord[];
}

const GATE_ENTITY = 'gate_record';

// Copies the current wording into `reviewedWording` on any claim row whose review
// date has just been set or changed. Matching is by Claim ID; a row with no id
// (still being typed) is left alone.
export function snapshotReviewedWording(project: ProjectData, rows: RegisterRow[]): RegisterRow[] {
  const previous = new Map(
    (project.registers['claimEvidenceTraceability'] ?? [])
      .filter((r) => String(r.claimId ?? '').trim() !== '')
      .map((r) => [String(r.claimId).trim(), r]),
  );
  return rows.map((row) => {
    const id = String(row.claimId ?? '').trim();
    const reviewDate = String(row.regulatoryReviewDate ?? '').trim();
    if (id === '' || reviewDate === '') return row;
    const before = previous.get(id);
    const dateChanged = String(before?.regulatoryReviewDate ?? '').trim() !== reviewDate;
    const neverSnapshotted = String(row.reviewedWording ?? '').trim() === '';
    if (!dateChanged && !neverSnapshotted) return row;
    return { ...row, reviewedWording: String(row.approvedWording ?? '').trim() };
  });
}

// D2's two derived Published Info fields, computed server-side for the same
// reason `reviewedWording` is: a value the record depends on must not be
// something the person the record is about can type.
//
//   masterWording    — the linked claim's own approved wording. Stored so the row
//                      shows what its channel wording was compared against, and
//                      re-read from the claim on every save so it cannot go stale.
//   noProductClaimBy — who asserted "this record contains no product claim or
//                      technical statement". Carried over from the stored row
//                      while the box stays ticked (so an existing declaration is
//                      not reattributed to whoever next edits an unrelated cell),
//                      stamped with the current user when it goes from unticked to
//                      ticked, cleared when unticked. The client's own value for
//                      this field is ALWAYS discarded — an earlier version kept it
//                      whenever the box was already ticked, which let a second
//                      save replace the real declarer with any name at all.
//   noProductClaimConfirmedBy / …At — Round 4 question 30(e), 2026-08-29: the
//                      content owner PROPOSES the exemption, and "the exemption
//                      must be confirmed by a Technical or Regulatory reviewer
//                      before release". Confirmation is an act with an author, so
//                      it is stamped from the session and never taken from the
//                      body — and only when the confirming user holds the
//                      capability, which is why `canConfirmExemption` is passed in
//                      rather than re-derived here.
export function syncPublishedInfoDerived(
  project: ProjectData,
  rows: RegisterRow[],
  actorName: string,
  canConfirmExemption: boolean,
): RegisterRow[] {
  const claimById = new Map(
    (project.registers['claimEvidenceTraceability'] ?? [])
      .filter((r) => String(r.claimId ?? '').trim() !== '')
      .map((r) => [String(r.claimId).trim(), r]),
  );
  // Rows are replace-the-whole-section, so identity comes from recordId where
  // there is one; a row without it is treated as new (worst case the declarer is
  // re-stamped, never dropped).
  const before = new Map(
    (project.registers['publishedInfoApproval'] ?? [])
      .filter((r) => String(r.recordId ?? '').trim() !== '')
      .map((r) => [String(r.recordId).trim(), r]),
  );
  return rows.map((row) => {
    const claimId = String(row.claimId ?? '').trim();
    const next: RegisterRow = {
      ...row,
      masterWording: claimId ? String(claimById.get(claimId)?.approvedWording ?? '') : '',
    };
    const stored = before.get(String(row.recordId ?? '').trim());
    const storedDeclarer = stored?.noProductClaim ? String(stored.noProductClaimBy ?? '').trim() : '';
    next.noProductClaimBy = row.noProductClaim ? storedDeclarer || actorName : '';

    // Question 30(e). An existing confirmation is carried over untouched; a new
    // one is only ever stamped for a user who holds the capability, and the
    // client's own value is always discarded — the same discipline as the
    // declarer above, for the same reason.
    const storedConfirmer = stored?.noProductClaim ? String(stored.noProductClaimConfirmedBy ?? '').trim() : '';
    const storedConfirmedAt = storedConfirmer ? String(stored?.noProductClaimConfirmedAt ?? '') : '';
    if (!row.noProductClaim) {
      next.noProductClaimConfirmedBy = '';
      next.noProductClaimConfirmedAt = '';
    } else if (storedConfirmer) {
      next.noProductClaimConfirmedBy = storedConfirmer;
      next.noProductClaimConfirmedAt = storedConfirmedAt;
    } else if (canConfirmExemption && row.confirmNoProductClaim === true) {
      // The confirmer may be the same person as the declarer — the answer names a
      // FUNCTION ("a Technical or Regulatory reviewer"), not a second pair of eyes,
      // and requiring two people would be a stricter rule than it states.
      //
      // C7 (SME rule audit, 2026-10-04): only when that reviewer ASKS to confirm
      // (`confirmNoProductClaim`, sent by the "Confirm exemption" control). It used
      // to be stamped on any save by a capability holder — a reviewer fixing a typo
      // elsewhere in the table confirmed every pending exemption without seeing it.
      next.noProductClaimConfirmedBy = actorName;
      next.noProductClaimConfirmedAt = new Date().toISOString().slice(0, 10);
    } else {
      next.noProductClaimConfirmedBy = '';
      next.noProductClaimConfirmedAt = '';
    }
    // A request flag, never stored.
    delete next.confirmNoProductClaim;
    return next;
  });
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly permissions: PermissionsService,
    private readonly totp: TotpService,
    private readonly jwt: JwtService,
    private readonly cosmetri: CosmetriDataService,
  ) {}

  // Binds a step-up code/proof to the exact act — a code minted for one
  // sign-off can never be spent on another, even by the same user.
  // Bound to the content hash too, so a code entered for one version of the phase cannot sign another.
  private signOffStepUpPurpose(id: string, phase: number, role: string, contentHash: string): string {
    return `sign_off:${id}:${phase}:${role}:${contentHash}`;
  }

  private phaseContentHash(project: ProjectData, phase: number): string {
    const content = phaseSignContent(project, phase);
    if (!content) throw new BadRequestException(`Unknown phase ${phase}`);
    return createHash('sha256').update(canonicalJson(content)).digest('hex');
  }

  // What the signer reads before signing a phase: everything the phase page shows for it, and the hash
  // their signature is bound to. Read-only — nothing is written, and any signed-in user may read project data.
  async previewPhaseSignOff(id: string, phase: number): Promise<PhaseSignPreview> {
    const row = await this.loadOrThrow(this.prisma, id);
    const project = toProjectData(row, [], await this.loadReference(this.prisma));
    const content = phaseSignContent(project, phase);
    if (!content) throw new BadRequestException(`Unknown phase ${phase}`);
    return {
      phase,
      hash: this.phaseContentHash(project, phase),
      previewedAt: new Date().toISOString(),
      sections: content.sections,
    };
  }

  // The content a phase signature attested to, as it was when signed — also for a signature since withdrawn. Read-only, any
  // signed-in user who may read the project. A signature given before the content began to be kept has none.
  async signedPhaseContent(id: string, phase: number, role: string, signedAt: string): Promise<PhaseSignedContent> {
    await this.loadOrThrow(this.prisma, id);
    const row = await this.prisma.auditEvent.findFirst({
      where: {
        projectId: id,
        action: 'sign_off.content',
        AND: [
          { after: { path: ['phase'], equals: phase } },
          { after: { path: ['role'], equals: role } },
          { after: { path: ['signedAt'], equals: signedAt } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
    });
    if (!row) throw new NotFoundException('The content of this signature was not kept (it was given before signed content was recorded)');
    const a = row.after as unknown as { contentHash: string; sections: PhaseSignedContent['sections'] };
    return { phase, role, signedAt, hash: a.contentHash, sections: a.sections };
  }

  private phaseContentChanged(): UnprocessableEntityException {
    return new UnprocessableEntityException({
      code: 'PHASE_CONTENT_CHANGED',
      message: 'This phase changed after you opened the signing preview — review it again before signing.',
    });
  }

  // SW-37: the gate decision (and Backtrack) belongs to the person nominated as "Approved by" for that gate, the project
  // Lead and administrators — assignment, not a role grid. Checked HERE, not only in the browser (BACKEND_PLAN §3 principle 7).
  // Contributing evidence needs no permission. Needs the project, so it runs inside the transaction once it is loaded.
  private assertCanDecide(user: SessionUser, project: ProjectData, gateId: string): void {
    const actor = { displayName: user.displayName, isAdmin: this.permissions.isAdmin(user) };
    if (!canDecideGateInProject(project, gateId, actor)) {
      throw new ForbiddenException(gateDecisionReason(gateId));
    }
  }

  // Round 4 questions 32(c) and 34(d) (2026-08-24). Being allowed to decide a gate
  // is not the same as being allowed to CARRY something under that decision.
  //
  // Both answers say Proceed with Conditions may serve as the authorised
  // acceptance — no separate acknowledgement step is required — but both attach an
  // authority condition to it. So the check belongs exactly here: only when the
  // decision being recorded is Proceed with Conditions, and only when there is
  // actually something for it to carry. A gate with no flagged finding and no open
  // change needs neither grant, which is why this is not folded into
  // `assertCanDecide`.
  private async assertCanCarryConditions(
    user: SessionUser,
    project: ProjectData,
    gateId: string,
    decision: GateRecord['decision'],
  ): Promise<void> {
    if (decision !== 'Proceed with Conditions') return;

    // The watch-list authority is NOT checked here any more (SW-32, 2026-10-14): it sits with the qualified reviewer who records
    // the assessment (see setRegisterRows), and the readiness list already checks the finding, so the gate is signed as usual.
    if (
      gateCarries(gateId, 'changeControlNoAdminImpact') &&
      gate11ConditionalChanges(project, project.changes).length > 0 &&
      !(await this.permissions.canAcknowledgeChangeImpact(user))
    ) {
      throw new ForbiddenException(
        `Gate ${gateId}: acknowledging an open change control needs authority to approve its Gate 11 impact ` +
          `(change-impact|acknowledge)`,
      );
    }
  }

  // ---------------------------------------------------------------- reads ----

  // Archived projects are hidden by default — archiving exists to get a retired
  // project out of the way without destroying it, so the default list must not
  // show it. `includeArchived` is how the UI offers "show archived".
  async list(includeArchived = false): Promise<ProjectListItem[]> {
    const rows = await this.prisma.project.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      include: { markets: { orderBy: { market: 'asc' } }, archivedBy: { select: { displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((p) => ({
      id: p.id,
      productCode: p.productCode,
      productSku: p.productSku,
      productGroup: p.productGroup,
      projectLead: p.projectLead,
      ownerDepartment: p.ownerDepartment,
      dateOpened: p.dateOpened.toISOString().slice(0, 10),
      targetLaunchDate: p.targetLaunchDate.toISOString().slice(0, 10),
      markets: p.markets.map((m) => m.market),
      version: p.version,
      archivedAt: p.archivedAt ? p.archivedAt.toISOString().slice(0, 10) : undefined,
      archivedBy: p.archivedBy?.displayName,
      stoppedAt: p.stoppedAt ? p.stoppedAt.toISOString().slice(0, 10) : undefined,
    }));
  }

  async get(id: string): Promise<ProjectEnvelope> {
    const row = await this.loadOrThrow(this.prisma, id);
    return this.envelope(row);
  }

  // Shared by every read and by the response of every write, so a mutation
  // response is indistinguishable from a fresh GET (the frontend replaces its
  // cached project with it wholesale).
  private async envelope(row: ProjectWithAll): Promise<ProjectEnvelope> {
    const events = await this.prisma.auditEvent.findMany({
      where: { projectId: row.id, entityType: GATE_ENTITY },
      include: { actor: { select: { displayName: true } } },
      orderBy: { occurredAt: 'asc' },
    });
    // Signing and withdrawing a gate signature, newest last — the history popup reads these.
    const signEvents = await this.prisma.auditEvent.findMany({
      where: { projectId: row.id, action: { in: ['gate_sign_off.signed', 'gate_sign_off.withdrawn'] } },
      include: { actor: { select: { displayName: true } } },
      orderBy: { occurredAt: 'asc' },
    });
    // Signing and withdrawing a PHASE signature, newest last — the phase's History drawer reads these.
    const phaseSignEvents = await this.prisma.auditEvent.findMany({
      where: { projectId: row.id, action: { in: ['sign_off.signed', 'sign_off.withdrawn'] } },
      include: { actor: { select: { displayName: true } } },
      orderBy: { occurredAt: 'asc' },
    });
    // Every edit of a reviewer's acknowledgement of a generated N/A reason (SW-29), oldest first.
    const ackEvents = await this.prisma.auditEvent.findMany({
      where: { projectId: row.id, action: { in: ['readiness_ack.recorded', 'readiness_ack.withdrawn'] } },
      include: { actor: { select: { displayName: true } } },
      orderBy: { occurredAt: 'asc' },
    });
    return {
      project: toProjectData(
        row,
        toGateChangeLog(events),
        await this.loadReference(this.prisma),
        toGateSignOffLog(signEvents),
        toReadinessAckLog(ackEvents),
        toPhaseSignOffLog(phaseSignEvents),
      ),
      version: row.version,
      changes: toChangeRecords(row) as ChangeRecord[],
    };
  }

  // The company reference datasets the rule engine reads (Round 4 questions 4 and
  // 17, 2026-08-24). Loaded on every read and inside every mutation transaction,
  // because the guards evaluate the SAME readiness rules the browser does and a
  // guard running against an empty overlay would be weaker than the UI it is meant
  // to be the authority over (BACKEND_PLAN principle 7).
  //
  // Taken with the caller's client so a guard sees the reference data as of its own
  // transaction, not a value read before the row lock was taken.
  private async loadReference(tx: Prisma.TransactionClient): Promise<ProjectReferenceData> {
    // Sequential, not Promise.all: `tx` is ONE pg connection for the whole
    // transaction, so parallel queries on it are pipelined onto a single client.
    // pg 8.22 deprecates that ("client.query() when the client is already
    // executing a query") and pg 9 removes it; these were never actually
    // concurrent, they were queued behind each other on that one connection.
    const marketProfiles = await tx.marketProfile.findMany({
      orderBy: { market: 'asc' },
      include: { updatedBy: { select: { displayName: true } } },
    });
    const rmRisk = await tx.rawMaterialRisk.findMany({
      orderBy: { rmCode: 'asc' },
      include: { updatedBy: { select: { displayName: true } } },
    });
    // Round 4 question 28 (2026-08-30). Only the columns the rules read: C1's
    // library condition needs the id and the status, and the UI picker needs the
    // wording and classification. The applicability tags, approval stamps and
    // revision history stay on the admin page — a project reads the library, it
    // does not administer it, and shipping the whole table into every project
    // envelope would be the same over-fetch the Cosmetri picker was fixed for.
    const claimsLibrary = await tx.claimLibraryEntry.findMany({
      orderBy: { wording: 'asc' },
      select: { id: true, wording: true, claimCategory: true, claimRisk: true, status: true, revision: true },
    });
    return {
      marketProfiles: marketProfiles.map((p) => ({
        id: p.id,
        market: p.market,
        adverseEventReporting: p.adverseEventReporting,
        pmsRecordsRequired: p.pmsRecordsRequired,
        reviewIntervalMonths: p.reviewIntervalMonths ?? undefined,
        enhancedSurveillance: p.enhancedSurveillance,
        dossierType: p.dossierType ?? undefined,
        claimRestrictions: p.claimRestrictions ?? undefined,
        packRequirements: p.packRequirements ?? undefined,
        evidenceLink: p.evidenceLink ?? undefined,
        reviewDate: p.reviewDate ?? undefined,
        notes: p.notes ?? undefined,
        revision: p.revision,
        updatedBy: p.updatedBy?.displayName,
        updatedAt: p.updatedAt.toISOString(),
      })),
      rmRisk: rmRisk.map((r) => ({
        id: r.id,
        rmCode: r.rmCode,
        displayName: r.displayName ?? undefined,
        flags: r.flags as RawMaterialRisk['flags'],
        evidenceLink: r.evidenceLink ?? undefined,
        reviewDate: r.reviewDate ?? undefined,
        notes: r.notes ?? undefined,
        revision: r.revision,
        updatedBy: r.updatedBy?.displayName,
        updatedAt: r.updatedAt.toISOString(),
      })),
      claimsLibrary: claimsLibrary.map((c) => ({
        id: c.id,
        wording: c.wording,
        claimCategory: c.claimCategory ?? undefined,
        claimRisk: c.claimRisk ?? undefined,
        status: c.status as ClaimLibraryEntry['status'],
        revision: c.revision,
      })),
    };
  }

  private async loadOrThrow(tx: Prisma.TransactionClient, id: string): Promise<ProjectWithAll> {
    const row = await tx.project.findUnique({ where: { id }, include: PROJECT_INCLUDE });
    if (!row) throw new NotFoundException(`Project ${id} not found`);
    return row;
  }

  // ------------------------------------------------------- create / delete ----

  async create(
    actorId: string,
    input: NewProjectInput,
    idempotencyKey: string,
  ): Promise<ProjectEnvelope> {
    const scope = 'project.create';
    const replayed = await this.idempotency.replay(scope, idempotencyKey);
    if (replayed) return replayed as ProjectEnvelope;

    if (input.id && (await this.prisma.project.findUnique({ where: { id: input.id } }))) {
      throw new BadRequestException(`Project id "${input.id}" already exists`);
    }
    if (await this.prisma.project.findUnique({ where: { productCode: input.productCode } })) {
      throw new BadRequestException(`Product code "${input.productCode}" already exists`);
    }

    // Two requests with the same id can both pass the checks above (a double click sends two keys); the
    // loser hits the primary key. Say so plainly instead of answering 500.
    const projectId = await this.prisma.$transaction(async (tx) => {
      const { projectId } = await createProjectWithScaffold(tx, input).catch((err: unknown) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictException(`Project "${input.id ?? input.productCode}" already exists — it may have just been created`);
        }
        throw err;
      });
      await this.audit.record(
        {
          actorId,
          projectId,
          entityType: 'project',
          entityId: projectId,
          action: 'project.created',
          after: { productCode: input.productCode, productSku: input.productSku },
        },
        tx,
      );
      return projectId;
    });

    const envelope = await this.envelope(await this.loadOrThrow(this.prisma, projectId));
    // Stored AFTER the work commits but keyed on the same intent: a retry now
    // replays this response instead of creating a second project.
    await this.prisma.$transaction((tx) =>
      this.idempotency.remember(tx, scope, idempotencyKey, 201, envelope as unknown as Prisma.InputJsonValue),
    );
    return envelope;
  }

  // Deleting a project destroys it across ~18 cascading tables AND, since
  // 2026-07-26, its entire audit trail with it (audit_events.projectId is now
  // onDelete: Cascade at the user's request). Restricted to System Administrator
  // by an isAdmin() check rather than a `project|delete` capability ON PURPOSE:
  // a capability would appear on the Roles page and could be granted to any
  // role, which would contradict "only System Administrator may delete". Roles
  // that need to retire a project use archive instead — reversible, and it keeps
  // the record.
  async remove(user: SessionUser, id: string): Promise<void> {
    if (!this.permissions.isAdmin(user)) {
      throw new ForbiddenException(
        'Only a System Administrator may delete a project (this also deletes its audit trail). Archive it instead.',
      );
    }
    const actorId = user.id;
    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Project ${id} not found`);
    await this.prisma.$transaction(async (tx) => {
      // Count what is about to be destroyed, so the tombstone below says how much
      // was lost rather than just naming the project.
      // Sequential: one transaction is one pg connection (see loadReference).
      const gates = await tx.gateRecord.count({ where: { projectId: id } });
      const registerRows = await tx.registerRow.count({ where: { projectId: id } });
      const auditRows = await tx.auditEvent.count({ where: { projectId: id } });

      // A TOMBSTONE, written deliberately WITHOUT `projectId`.
      //
      // Every other audit row for this project is destroyed with it (that is the
      // requested behaviour — audit_events.projectId cascades). If this row
      // carried the projectId it would be destroyed too, and a project could
      // vanish leaving no trace whatsoever that it ever existed or who removed
      // it. That is unacceptable in a system built on "no silent corrections"
      // (B4), so the record of the DELETION outlives the project's own trail.
      // It is self-contained for the same reason: once the cascade runs there is
      // nothing left to join back to.
      await this.audit.record(
        {
          actorId,
          entityType: 'project',
          entityId: id,
          action: 'project.deleted',
          before: {
            id,
            productCode: row.productCode,
            productSku: row.productSku,
            projectLead: row.projectLead,
            wasArchived: !!row.archivedAt,
            destroyed: { gateRecords: gates, registerRows, auditEvents: auditRows },
          },
        },
        tx,
      );
      await tx.project.delete({ where: { id } });
    });
  }

  // Archive (reversible) — the route every non-admin role has for retiring a
  // project. Gated by the `project|archive` capability, seeded to Project Owner
  // only; admin short-circuits every permission check in this codebase, and must
  // here too, since it can already do the strictly more destructive delete.
  async setArchived(user: SessionUser, id: string, archived: boolean): Promise<ProjectEnvelope> {
    if (!(await this.permissions.hasPermission(user, 'project', 'archive'))) {
      throw new ForbiddenException(
        `Your role may not ${archived ? 'archive' : 'restore'} a project (needs project|archive)`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.project.findUnique({ where: { id } });
      if (!row) throw new NotFoundException(`Project ${id} not found`);
      if (!!row.archivedAt === archived) {
        throw new BadRequestException(`Project ${id} is already ${archived ? 'archived' : 'active'}`);
      }
      await tx.project.update({
        where: { id },
        data: {
          archivedAt: archived ? new Date() : null,
          archivedById: archived ? user.id : null,
          version: { increment: 1 },
        },
      });
      await this.audit.record(
        {
          actorId: user.id,
          projectId: id,
          entityType: 'project',
          entityId: id,
          action: archived ? 'project.archived' : 'project.restored',
          before: { archivedAt: row.archivedAt?.toISOString() ?? null },
          after: { archivedAt: archived ? new Date().toISOString() : null },
        },
        tx,
      );
    });
    return this.envelope(await this.loadOrThrow(this.prisma, id));
  }

  // Stop (SW-31, project owner 2026-10-14): the final end of a project that cannot go on. Only the project's
  // Lead or an administrator may do it, only while a Critical gap assessment stands (`projectStopGrounds`), and
  // never while a market is launched. The server writes WHY from the project's own data at that moment; the
  // caller supplies only the comment. Not reversible.
  async stopProject(user: SessionUser, id: string, comment: string | undefined): Promise<ProjectEnvelope> {
    const text = (comment ?? '').trim();
    if (text === '') throw new BadRequestException('A comment explaining why the project is stopped is required');
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projects WHERE id = ${id} FOR UPDATE`;
      const row = await this.loadOrThrow(tx, id);
      const project = toProjectData(row, [], await this.loadReference(tx));
      if (!this.permissions.isAdmin(user) && project.identity.projectLead.trim() !== user.displayName.trim()) {
        throw new ForbiddenException(`Only the project's Lead (${project.identity.projectLead}) or an administrator may stop it`);
      }
      const refusal = stopRefusal(project);
      if (refusal) throw new BadRequestException(refusal);
      const grounds = projectStopGrounds(project);
      const atGate = GATES[currentGateIndex(project)]?.id ?? null;
      await tx.project.update({
        where: { id },
        data: {
          stoppedAt: new Date(),
          stoppedById: user.id,
          stopAtGate: atGate,
          stopComment: text,
          stopGrounds: grounds as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      await this.audit.record(
        {
          actorId: user.id,
          projectId: id,
          entityType: 'project',
          entityId: id,
          action: 'project.stopped',
          before: { stoppedAt: null },
          after: { stoppedAt: new Date().toISOString(), atGate, comment: text, grounds } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    });
    return this.envelope(await this.loadOrThrow(this.prisma, id));
  }

  // ----------------------------------------------- a standing signature locks what it vouches for ----
  //
  // Prepared, Reviewed and Approved must attest to ONE content. So while any of them stands on a gate that
  // has not passed yet, the data that gate is accountable for cannot change (project owner, 2026-10-11).
  // Data that belongs to LATER gates stays open to contribution — the gate's snapshot only counts what the
  // gate owns (SW-5) — and so does the state of an accepted condition (SW-19). Withdrawing the signature
  // is how the content is opened again.
  //
  // One central check rather than a guard in every write path: whatever the write was, compare what each
  // standing signature was given against what it would now be given, and refuse a write that CHANGES it.
  // Changes that were already there before this write do not count against it.
  //
  // A passed gate is skipped: its evidence is already frozen by the pass lock, and its signatures are
  // cleared in the same transaction if the gate is reopened.
  private standingGateSignatures(project: ProjectData): { gateId: string; market?: string; role: GateSignOffRole; before: Set<string> }[] {
    const lanes: { gateId: string; market?: string; role: GateSignOffRole; before: Set<string> }[] = [];
    const passed = new Map<string, boolean>();
    for (const s of project.gateSignOffs) {
      if (!s.signedAt) continue;
      if (!passed.has(s.gateId)) passed.set(s.gateId, isGatePassed(project, s.gateId));
      if (passed.get(s.gateId)) continue;
      lanes.push({
        gateId: s.gateId,
        market: s.market ?? undefined,
        role: s.role as GateSignOffRole,
        before: new Set(gateSignOffStaleChanges(project, s.gateId, s.market ?? undefined, s.role as GateSignOffRole)),
      });
    }
    return lanes;
  }

  private async assertSignedContentUnchanged(
    tx: Prisma.TransactionClient,
    id: string,
    lanes: { gateId: string; market?: string; role: GateSignOffRole; before: Set<string> }[],
  ): Promise<void> {
    if (lanes.length === 0) return;
    const after = toProjectData(await this.loadOrThrow(tx, id), [], await this.loadReference(tx));
    for (const lane of lanes) {
      const stillStands = after.gateSignOffs.some(
        (s) => s.gateId === lane.gateId && (s.market ?? undefined) === lane.market && s.role === lane.role && !!s.signedAt,
      );
      if (!stillStands) continue; // this very write cleared it (a withdrawal, a Backtrack, a new formula version)
      const introduced = gateSignOffStaleChanges(after, lane.gateId, lane.market, lane.role).filter((c) => !lane.before.has(c));
      if (introduced.length > 0) {
        throw new ForbiddenException(
          listMessage(
            `Gate ${lane.gateId}${lane.market ? ` (${lane.market})` : ''} has a "${lane.role}" signature standing, so what it signed is locked:`,
            introduced,
            'Withdraw the signature (with a reason) to change it.',
          ),
        );
      }
    }
  }

  // ------------------------------------------------- section mutations ----
  //
  // M3 Phase 2-6 (2026-07-26): every remaining `ProjectData` field moves off the
  // browser and into Postgres. All of them share the same envelope — one
  // transaction, row lock, `expectedVersion` check, archived check, version bump
  // and audit row — so that lives here once instead of being copy-pasted 19
  // times (and forgotten once).
  //
  // `write` receives the locked Prisma row AND the same row already mapped to
  // `ProjectData`, because the guards it has to honour (isGateRefLocked, C5, C2)
  // are the shared pure functions that operate on ProjectData — the store's
  // guards are ported by CALLING them, never by restating them.
  private async mutate(
    user: SessionUser,
    id: string,
    // `null` skips the project-wide version check. Used by gate signing ONLY, which is guarded by a
    // content hash of what is being signed instead, so other people can keep working on the project
    // while a signer reads. The row lock still serialises the write.
    expectedVersion: number | null,
    action: string,
    write: (
      tx: Prisma.TransactionClient,
      row: ProjectWithAll,
      project: ProjectData,
    ) => Promise<Prisma.InputJsonValue | void>,
  ): Promise<ProjectEnvelope> {
    await this.prisma.$transaction(async (tx) => {
      const row = await this.loadVersionLocked(tx, id, expectedVersion);
      const project = toProjectData(row, [], await this.loadReference(tx));
      // The signing acts and a new formula version do not change what a signature vouches for, or clear it
      // themselves; checking them would only cost a second load.
      const lanes = /^(gate_sign_off|sign_off|register_close|register_signature|formula_version)\./.test(action)
        ? []
        : this.standingGateSignatures(project);
      const after = await write(tx, row, project);
      await this.assertSignedContentUnchanged(tx, id, lanes);
      await this.bumpVersion(tx, id);
      await this.audit.record(
        {
          actorId: user.id,
          projectId: id,
          entityType: 'project_section',
          entityId: id,
          action,
          ...(after ? { after } : {}),
        },
        tx,
      );
    });
    return this.envelope(await this.loadOrThrow(this.prisma, id));
  }

  private dateOrNull(value: string | undefined): Date | null {
    return value ? new Date(value) : null;
  }

  // --- Phase 2: checklists / requirements / gate checks / phase closure ---

  // Gate-level edit lock (B4): a checklist section whose gate has passed is
  // read-only — correcting it requires Backtrack.
  async setChecklistSection(
    user: SessionUser,
    id: string,
    section: string,
    items: ChecklistItem[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'checklist.updated', async (tx, row, project) => {
      const cfg = Object.values(PHASE_CONFIGS)
        .flatMap((c) => c.checklistSections)
        .find((sec) => sec.key === section);
      if (!cfg) throw new BadRequestException(`Unknown checklist section "${section}"`);
      if (isGateRefLocked(project, cfg.gate)) {
        throw new ForbiddenException(
          `Checklist "${section}" belongs to gate ${cfg.gate}, which has passed — it is read-only (use Backtrack)`,
        );
      }
      // 2026-08-11: un-ticking a target user that the Vulnerable-User Assessment
      // depends on would orphan that row — the same dependency guard as a
      // Supplier & RM Evidence row a Formula BOM line still references. Remove
      // the assessment row first.
      if (section === 'targetUsers') {
        const pinned = targetUsersPinnedByAssessment(project);
        const removed = pinned.filter((pin) => !items.some((i) => i.label === pin.label && i.selected));
        if (removed.length > 0) {
          throw new BadRequestException(
            removed
              .map(
                (pin) =>
                  `Cannot un-select "${pin.label}": the Vulnerable-User Assessment has a "${pin.group}" row that depends on it — remove that row first`,
              )
              .join('\n'),
          );
        }
      }
      // A target user that would make an acknowledged "not applicable" untrue cannot be ticked until that acknowledgement is
      // withdrawn (project owner, 2026-11-06).
      if (section === 'targetUsers') {
        const voided = acknowledgementsVoidedByTargetUsers(project, items);
        if (voided.length > 0) throw new BadRequestException(voidedAcknowledgementsMessage(voided));
      }
      const existing = row.checklistItems.filter((i) => i.sectionKey === section);
      if (items.length !== existing.length) {
        throw new BadRequestException(
          `Checklist "${section}" expects ${existing.length} rows, received ${items.length}`,
        );
      }
      // Rows are seeded from config and never added/removed, so they are matched
      // by their stable itemOrder rather than by array position.
      const byOrder = [...existing].sort((a, b) => a.itemOrder - b.itemOrder);
      // Sequential: one transaction is one pg connection (see loadReference).
      for (const [index, item] of items.entries()) {
        await tx.checklistItem.update({
          where: { id: byOrder[index].id },
          data: {
            selected: item.selected,
            status: item.status,
            // Round 4 question 22(b). Un-selecting an option clears its Primary
            // flag here rather than trusting the client to: a row that is
            // primary but not selected is the one state
            // `checklistPrimarySelected` treats as no answer at all, and it
            // would be invisible on screen (the Primary control only renders on
            // a selected row).
            isPrimary: !!item.isPrimary && item.selected,
            evidenceLink: item.evidenceLink ?? null,
            notes: item.notes ?? null,
          },
        });
      }
      return { section, rows: items.length };
    });
  }

  // Requirement rows can span several gates, so the lock is applied PER ROW:
  // a locked row keeps its committed value while the rest take the incoming one
  // (ported from the store's setRequirementSection merge).
  async setRequirementSection(
    user: SessionUser,
    id: string,
    section: string,
    items: RequirementItem[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'requirement.updated', async (tx, row, project) => {
      const existing = row.requirementItems
        .filter((i) => i.sectionKey === section)
        .sort((a, b) => a.itemOrder - b.itemOrder);
      if (existing.length === 0) throw new BadRequestException(`Unknown requirement section "${section}"`);
      // A table that exists only for a trigger is read-only while that trigger does not apply (SW-56). The data is cleared by
      // acknowledging the not-applicable reason, never edited around it.
      if (requirementSectionLockedAsNotApplicable(project, section)) {
        throw new BadRequestException(
          `"${section}" does not apply to this project, so it cannot be edited — change what makes it not apply (for the infant tables: the Infant 0+ target user, or the family-use age groups at Gate 02)`,
        );
      }
      if (items.length !== existing.length) {
        throw new BadRequestException(
          `Requirement section "${section}" expects ${existing.length} rows, received ${items.length}`,
        );
      }
      // N/A exists only on a section declaring `allowNotApplicable` (question 21);
      // elsewhere a row is a plain obligation and only the work statuses apply.
      const sectionConfig = Object.values(PHASE_CONFIGS)
        .flatMap((p) => p.requirementSections)
        .find((r) => r.key === section);
      // A section the workbook gives its own Status list (phases.ts `statusOptions`) takes exactly that list.
      const allowedStatuses: readonly string[] =
        sectionConfig?.statusOptions ??
        (sectionConfig?.allowNotApplicable ? [...WORK_STATUSES, REQUIREMENT_NOT_APPLICABLE] : WORK_STATUSES);
      for (const item of items) {
        assertOneOf(`Requirement "${item.requirement}" status`, item.status, allowedStatuses);
        if (sectionConfig?.showYnna && (item.ynna ?? '') !== '') {
          assertOneOf(`Requirement "${item.requirement}" Y/N/NA`, item.ynna, COMPARTMENT_YNNA);
        }
        assertOneOf(`Requirement "${item.requirement}" priority`, item.priority, REQUIREMENT_PRIORITIES);
      }
      let skipped = 0;
      for (const [index, item] of items.entries()) {
        const target = existing[index];
        // Rows tagged 'ALL' belong to no gate, so no gate locks them; Phase 4's signature does (SW-22).
        if (isGateRefLocked(project, target.gate) || (target.gate === 'ALL' && isPhaseDataLocked(project, 4))) {
          skipped++;
          continue;
        }
        await tx.requirementItem.update({
          where: { id: target.id },
          data: {
            status: item.status,
            // Phase 1 only (B6); undefined on every other section, and Prisma
            // skips undefined, so those rows are untouched.
            priority: item.priority ?? undefined,
            requirementText: item.requirementText ?? undefined,
            // Round 4 question 21. Cleared whenever the row is not N/A, so a
            // rationale can never outlive the disposition that required it and
            // read as evidence for a row that is now Completed.
            naRationale: item.status === 'N/A' && sectionConfig?.allowNotApplicable ? (item.naRationale ?? null) : null,
            ynna: sectionConfig?.showYnna ? (item.ynna || null) : undefined,
            // Editable on any section declaring its own columns (Phase 1's B6
            // table); on Phases 2-4 it is config-set and rendered read-only, so
            // what arrives is the value already stored. It was missing from this
            // list entirely until 2026-08-29 — the Phase 1 Owner column accepted
            // typing and silently discarded it on save.
            owner: item.owner,
            evidenceLink: item.evidenceLink ?? null,
            notes: item.notes ?? null,
          },
        });
      }
      return { section, rows: items.length, skippedLocked: skipped };
    });
  }

  // Identified by (gate, check) rather than array index: the store used an index
  // into its own copy, which only worked because both sides happened to sort the
  // same way. The pair is the row's real identity.
  async setGateChecks(
    user: SessionUser,
    id: string,
    updates: { gate: string; check: string; market?: string; patch: Partial<GateCheck> }[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'gate_checks.updated', async (tx, row, project) => {
      let skipped = 0;
      for (const update of updates) {
        const target = row.gateChecks.find(
          (c) => c.gate === update.gate && c.check === update.check && (c.market ?? '') === (update.market ?? ''),
        );
        // Also skipped: a row the project's own answers make not applicable (an administrative-only change confirmed, for the
        // competitor/benchmark row), so it cannot be filled in as though that review had been done. [ASSUMPTION: R6-Q5]
        if (!target || isGateRefLocked(project, target.gate) || gateCheckExemption(project, target.gate, target.check)) {
          skipped++;
          continue; // locked gate -> skip the row, same as the store did
        }
        const p = update.patch;
        await tx.gateCheck.update({
          where: { id: target.id },
          data: {
            ...(p.done !== undefined ? { done: p.done } : {}),
            ...(p.ynna !== undefined ? { ynna: p.ynna } : {}),
            ...('date' in p ? { date: this.dateOrNull(p.date) } : {}),
            ...('evidenceRef' in p ? { evidenceRef: p.evidenceRef ?? null } : {}),
            ...('methodRef' in p ? { methodRef: p.methodRef ?? null } : {}),
            ...('internalLink' in p ? { internalLink: p.internalLink ?? null } : {}),
            ...('initials' in p ? { initials: p.initials ?? null } : {}),
            ...('notes' in p ? { notes: p.notes ?? null } : {}),
          },
        });
      }
      return { updated: updates.length - skipped, skippedLocked: skipped };
    });
  }

  private assertPhaseDataOpen(project: ProjectData, phase: number): void {
    if (isPhaseDataLocked(project, phase)) {
      throw new ForbiddenException(`Phase ${phase}: ${PHASE_DATA_LOCKED_REASON}`);
    }
  }

  private async phaseClosureId(tx: Prisma.TransactionClient, id: string, phase: number): Promise<string> {
    const closure = await tx.phaseClosure.findUnique({
      where: { projectId_phase: { projectId: id, phase } },
      select: { id: true },
    });
    if (!closure) throw new NotFoundException(`Phase ${phase} closure not found on project ${id}`);
    return closure.id;
  }

  async setAngles(
    user: SessionUser,
    id: string,
    phase: number,
    angles: AngleRow[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'angles.updated', async (tx, _row, project) => {
      this.assertPhaseDataOpen(project, phase);
      const closureId = await this.phaseClosureId(tx, id, phase);
      for (const a of angles) {
        await tx.angleRow.update({
          where: { phaseClosureId_angle: { phaseClosureId: closureId, angle: a.angle } },
          data: {
            ynna: a.ynna,
            covered: a.covered,
            date: this.dateOrNull(a.date),
            evidenceRef: a.evidenceRef ?? null,
            internalLink: a.internalLink ?? null,
            initials: a.initials ?? null,
            comments: a.comments ?? null,
          },
        });
      }
      return { phase, angles: angles.length };
    });
  }

  // -------------------------------------------------------------------------
  // Phase sign-off (D1). A signature is an authenticated ACT, not a typed name.
  //
  // Before this, the whole block was one bulk field write: `name` and `initials`
  // were free text, so a row could name one person while `signedByUserId` — the
  // one field the server did take from the session — recorded another, and no
  // screen ever showed the mismatch. The three routes below replace it:
  //
  //   assignees → the project's Lead nominates who signs each of the 3 roles
  //   sign      → only that person may sign; the server writes all 6 D1 fields
  //   withdraw  → the signer (or an admin) releases it, with a reason
  //
  // Nothing about a signature is client-supplied except the decision and the
  // comment. Who, which role, when and against which record version all come
  // from the session and the locked project row.
  // -------------------------------------------------------------------------

  // The Lead is matched by displayName because ProjectIdentity.projectLead
  // stores exactly that (the Create form's user picker writes the picked user's
  // displayName, same as `reviewers`). Storing a user id there would be more
  // robust and is the obvious later improvement, but it is a schema change to
  // `projects`, not to sign-off. [ASSUMPTION: R5-Q1]
  private assertIsProjectLead(user: SessionUser, project: ProjectData, action = 'assign phase sign-off signers'): void {
    if (this.permissions.isAdmin(user)) return;
    if (project.identity.projectLead.trim() !== user.displayName.trim()) {
      throw new ForbiddenException(`Only the project's Lead (${project.identity.projectLead}) may ${action}`);
    }
  }

  // Initials are DERIVED from the account, not typed — the workbook keeps a
  // "Signature / initials" column and this fills it without reopening the free
  // text field that made a signature unverifiable.
  private initialsOf(displayName: string): string {
    return (
      displayName
        .trim()
        .split(/\s+/)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 4) || null
    ) as string;
  }

  async setSignOffAssignees(
    user: SessionUser,
    id: string,
    phase: number,
    assignments: { role: SignOff['role']; userId?: string | null }[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(
      user,
      id,
      expectedVersion,
      'sign_off_assignees.updated',
      async (tx, _row, project) => {
        this.assertIsProjectLead(user, project);
        const closureId = await this.phaseClosureId(tx, id, phase);
        const rows = await tx.signOff.findMany({ where: { phaseClosureId: closureId } });
        let changed = 0;
        for (const assignment of assignments) {
          const existing = rows.find((r) => r.role === assignment.role);
          if (!existing) {
            throw new NotFoundException(
              `Sign-off row "${assignment.role}" not found on phase ${phase}`,
            );
          }
          const next = assignment.userId ?? null;
          if (existing.assignedToUserId === next) continue;
          // A signed row keeps its signer. Reassigning it would leave a
          // signature standing next to somebody else's name (B4).
          if (existing.signedAt) {
            throw new BadRequestException(
              `"${assignment.role}" is already signed — withdraw the signature before reassigning it`,
            );
          }
          if (next) {
            const target = await tx.user.findUnique({
              where: { id: next },
              select: { active: true },
            });
            if (!target?.active) {
              throw new BadRequestException(
                `Cannot assign "${assignment.role}" to an unknown or deactivated user`,
              );
            }
          }
          await tx.signOff.update({
            where: { id: existing.id },
            data: { assignedToUserId: next },
          });
          changed += 1;
        }
        return { phase, changed };
      },
    );
  }

  // The optional "attach my saved signature" flow, in one step: a code from
  // the signer's authenticator app is exchanged for a short-lived, single-use
  // proof token (2026-08-21, replacing an emailed code — the factor now lives
  // on a device the signer holds rather than in a mailbox other people can
  // reach, and it needs no Mail.Send grant or licensed mailbox to work).
  //
  // The same nomination guards signSignOff applies are re-applied here, so a
  // user cannot even spend a code against a row they are not entitled to
  // sign. The token itself carries no privilege beyond "this StepUpProof row
  // was created" — signSignOff re-checks it against the DB inside the signing
  // transaction rather than trusting the JWT alone.
  async verifySignOffStepUp(
    user: SessionUser,
    id: string,
    phase: number,
    role: SignOff['role'],
    code: string,
    expectedHash: string | undefined,
  ): Promise<{ stepUpToken: string }> {
    const closureId = await this.phaseClosureId(this.prisma, id, phase);
    const existing = await this.prisma.signOff.findFirst({ where: { phaseClosureId: closureId, role } });
    if (!existing) throw new NotFoundException(`Sign-off row "${role}" not found on phase ${phase}`);
    if (existing.signedAt) {
      throw new BadRequestException(`"${role}" is already signed — withdraw it first`);
    }
    if (existing.assignedToUserId !== user.id) {
      throw new ForbiddenException(`"${role}" is assigned to somebody else — only the assigned signer may sign it`);
    }
    const signature = await this.prisma.userSignature.findUnique({ where: { userId: user.id } });
    if (!signature) {
      throw new BadRequestException('Save a signature in My Account before attaching one to a sign-off');
    }
    if (!expectedHash) throw new BadRequestException('expectedHash is required — open the signing preview first');
    // Refused BEFORE the code is spent: a stale preview must not burn the signer's one-time code.
    const current = toProjectData(await this.loadOrThrow(this.prisma, id), [], await this.loadReference(this.prisma));
    if (this.phaseContentHash(current, phase) !== expectedHash) throw this.phaseContentChanged();
    await this.totp.verifyForStepUp(user.id, code);
    const purpose = this.signOffStepUpPurpose(id, phase, role, expectedHash);
    const proof = await this.prisma.stepUpProof.create({
      data: { userId: user.id, purpose, channel: 'totp' },
    });
    const stepUpToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'sign_off_step_up', proof: proof.id, purpose },
      { expiresIn: '5m' },
    );
    return { stepUpToken };
  }

  async signSignOff(
    user: SessionUser,
    id: string,
    phase: number,
    role: SignOff['role'],
    input: { decision?: string; comments?: string; stepUpToken?: string; expectedHash?: string },
  ): Promise<ProjectEnvelope> {
    // No project-wide version: whether the phase may be signed is decided from the data inside the
    // locked transaction (closure conditions, B3), so an edit elsewhere in the project must not
    // refuse a signature. The row lock still serialises it.
    return this.mutate(user, id, null, 'sign_off.signed', async (tx, row, project) => {
      const closureId = await this.phaseClosureId(tx, id, phase);
      const existing = await tx.signOff.findFirst({ where: { phaseClosureId: closureId, role } });
      if (!existing) throw new NotFoundException(`Sign-off row "${role}" not found on phase ${phase}`);
      if (existing.signedAt) {
        throw new BadRequestException(
          `"${role}" was already signed by ${existing.name ?? 'another user'} — withdraw it first`,
        );
      }
      if (!existing.assignedToUserId) {
        throw new BadRequestException(
          `"${role}" has no assigned signer yet — the project's Lead assigns one`,
        );
      }
      if (existing.assignedToUserId !== user.id) {
        throw new ForbiddenException(
          `"${role}" is assigned to somebody else — only the assigned signer may sign it`,
        );
      }
      // The three phase signatures are an order, like a gate's (project owner, 2026-10-14): Prepared by, then
      // Reviewed by, then Approved by. A review of nothing, or an approval before the review, is not a sign-off.
      this.assertSequence(await tx.signOff.findMany({ where: { phaseClosureId: closureId } }), role as GateSignOffRole);
      // SW-37: the "Approved by" row needs nothing beyond being the person the Lead nominated for it (it used to also need
      // `phase:N|approve`; the nomination is the authority now).
      // B3: the closure conditions are enforced HERE, not only by the UI lock
      // (BACKEND_PLAN §3 principle 7). Before this, a direct API call could
      // sign a phase whose gates had not passed at all.
      if (!phaseCompletionChecklist(project, phase).canSignOff) {
        throw new BadRequestException(
          `Phase ${phase} closure conditions are not met yet — sign-off is locked`,
        );
      }

      const decision = input.decision?.trim();
      if (!decision) throw new BadRequestException('A decision is required to sign');
      if (!(GATE_DECISIONS as readonly string[]).includes(decision)) {
        throw new BadRequestException(`"${decision}" is not a valid decision`);
      }
      // Backtrack is an action with its own record (B4), not a word a signature
      // can carry — signing it would leave a gate marked "Backtrack" that nothing
      // reopened.
      if (decision === 'Backtrack') {
        throw new BadRequestException('Backtrack is recorded with the Backtrack action, not as a sign-off decision');
      }
      // D1 asked for "comment where required" without saying when. Read as:
      // anything other than a plain Proceed carries a condition or a reason
      // that must be written down.
      //
      // Round 4 question 29(2) (2026-08-24) confirmed the shape of that reading and
      // named ten decisions. Since the gate sign-off landed (2026-08-29) both
      // surfaces read the SAME list — `gateSignOffNeedsComment` — rather than each
      // carrying its own test: the old `!== 'Proceed'` here happened to agree with
      // the answer for the five decisions this enum carries, and would have
      // stopped agreeing the moment a sixth was added on one side only.
      //
      // Whether D1's field set applies to the PHASE block at all (it is written
      // for gate sign-off) is [ASSUMPTION: R5-Q2].
      const comments = input.comments?.trim();
      if (gateSignOffNeedsComment(decision) && !comments) {
        throw new BadRequestException(`A comment is required when the decision is "${decision}"`);
      }

      // The signer signs what they were SHOWN (project owner, 2026-10-10: the data on the phase's own
      // screen is the scope). Compared here, inside the row-locked transaction, so the content cannot
      // change between this check and the write.
      if (!input.expectedHash) {
        throw new BadRequestException('expectedHash is required — open the signing preview first');
      }
      if (this.phaseContentHash(project, phase) !== input.expectedHash) throw this.phaseContentChanged();

      // MANDATORY since 2026-08-22 (project owner): every sign-off carries the
      // signer's saved signature and a fresh authenticator code. It was opt-in
      // for one day, which left a weaker no-image path in place and meant the
      // second factor protected the IMAGE rather than the signing act. Enforced
      // HERE and not only in the browser — the UI hiding a path is not the same
      // as the API refusing it (BACKEND_PLAN §3 principle 7).
      //
      // D1 itself asks for six fields and mentions no drawn signature, so
      // whether the review team wants one at all is still open:
      // [ASSUMPTION: R5-Q4]
      let signatureImage: string | null = null;
      {
        if (!input.stepUpToken) {
          throw new BadRequestException(
            'An authenticator code is required to sign — enter the code from your authenticator app',
          );
        }
        let payload: { sub?: string; typ?: string; proof?: string; purpose?: string };
        try {
          payload = await this.jwt.verifyAsync(input.stepUpToken);
        } catch {
          throw new BadRequestException('Verification expired or invalid — enter a new code');
        }
        const expectedPurpose = this.signOffStepUpPurpose(id, phase, role, input.expectedHash);
        if (payload.typ !== 'sign_off_step_up' || payload.sub !== user.id || payload.purpose !== expectedPurpose) {
          throw new BadRequestException('Verification does not match this sign-off');
        }
        const proof = payload.proof
          ? await tx.stepUpProof.findUnique({ where: { id: payload.proof } })
          : null;
        if (!proof || proof.userId !== user.id || proof.usedForId) {
          throw new BadRequestException('Verification already used or invalid — enter a new code');
        }
        const signature = await tx.userSignature.findUnique({ where: { userId: user.id } });
        if (!signature) {
          throw new BadRequestException(
            'Save a signature in My Account before signing — every sign-off attaches it',
          );
        }
        // Stamped inside this same row-locked transaction — makes the proof
        // single-use even though the JWT itself is stateless.
        await tx.stepUpProof.update({ where: { id: proof.id }, data: { usedForId: existing.id } });
        signatureImage = signature.imageData;
      }

      const now = new Date();
      await tx.signOff.update({
        where: { id: existing.id },
        data: {
          name: user.displayName,
          initials: this.initialsOf(user.displayName),
          date: now,
          decision,
          comments: comments || null,
          signedByUserId: user.id,
          signedAt: now,
          // Snapshotted, never re-read: a role change tomorrow must not rewrite
          // what this signature claimed today.
          roleAtSigning: user.roles.map((r) => r.role.name).join(', ') || null,
          // The version the signature attests to — the row is locked FOR UPDATE
          // in this transaction, so this is the exact state that was signed.
          recordVersion: row.version,
          // Signature image is likewise a snapshot at signing time (see the
          // schema comment on SignOff) — null on the common, no-image path.
          signatureImage,
          signatureVerifiedAt: signatureImage ? now : null,
        },
      });
      // The exact content this signature was given for, kept in full (it is what `expectedHash` fingerprints), so the
      // phase's History can show it after the row is wiped by a withdrawal. A separate row from the act itself because it
      // is large; the same arrangement as a gate's `gate_sign_off.content`.
      await this.audit.record(
        {
          actorId: user.id,
          projectId: id,
          entityType: 'sign_off_content',
          entityId: existing.id,
          action: 'sign_off.content',
          after: {
            phase,
            role,
            signedAt: now.toISOString(),
            contentHash: input.expectedHash,
            sections: phaseSignContent(project, phase)?.sections ?? [],
          } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
      return {
        phase,
        role,
        decision,
        // What was signed, kept on the audit row so the phase's History can still show it after a withdrawal wipes the row.
        comment: comments || null,
        signedAt: now.toISOString(),
        recordVersion: row.version,
        signatureAttached: !!signatureImage,
      };
    });
  }

  // Only the person who signed may release their own signature (an admin too,
  // for the case where that account is gone). Deliberately NOT the Lead: a Lead
  // who could clear a reviewer's signature could overturn a decision they
  // disagree with. A reason is mandatory — B4, no silent corrections; it lands
  // on the audit row. [ASSUMPTION: R5-Q1]
  async withdrawSignOff(
    user: SessionUser,
    id: string,
    phase: number,
    role: SignOff['role'],
    reason: string,
  ): Promise<ProjectEnvelope> {
    const why = reason?.trim();
    if (!why) throw new BadRequestException('A reason is required to withdraw a signature');
    return this.mutate(user, id, null, 'sign_off.withdrawn', async (tx) => {
      const closureId = await this.phaseClosureId(tx, id, phase);
      const existing = await tx.signOff.findFirst({ where: { phaseClosureId: closureId, role } });
      if (!existing) throw new NotFoundException(`Sign-off row "${role}" not found on phase ${phase}`);
      if (!existing.signedAt) throw new BadRequestException(`"${role}" is not signed`);
      if (existing.signedByUserId !== user.id && !this.permissions.isAdmin(user)) {
        throw new ForbiddenException(
          `Only ${existing.name ?? 'the signer'} may withdraw this signature`,
        );
      }
      // The order runs the other way too: releasing the preparer's signature while a reviewer's still stands would leave
      // a review of nothing. Later signatures are withdrawn first.
      const later = GATE_SIGNOFF_ROLES.slice(GATE_SIGNOFF_ROLES.indexOf(role as GateSignOffRole) + 1);
      const standing = (await tx.signOff.findMany({ where: { phaseClosureId: closureId } })).filter(
        (r) => later.includes(r.role as GateSignOffRole) && r.signedAt,
      );
      if (standing.length > 0) {
        throw new BadRequestException(
          `Withdraw ${standing.map((r) => `"${r.role}"`).join(' and ')} first — a later signature rests on this one`,
        );
      }
      await tx.signOff.update({
        where: { id: existing.id },
        data: {
          name: null,
          initials: null,
          date: null,
          decision: null,
          comments: null,
          signedByUserId: null,
          signedAt: null,
          roleAtSigning: null,
          recordVersion: null,
          signatureImage: null,
          signatureVerifiedAt: null,
          // The assignment survives — the same person is still the nominated
          // signer unless the Lead changes it.
        },
      });
      return {
        phase,
        role,
        reason: why,
        previousSigner: existing.name ?? null,
        // What is being withdrawn: the row is wiped just above, so the audit is the only record of it.
        previousDecision: existing.decision ?? null,
        previousComment: existing.comments ?? null,
        previousSignedAt: existing.signedAt.toISOString(),
      };
    });
  }

  // -------------------------------------------------------------------------
  // Per-gate sign-off (Round 4 questions 18 and 29, 2026-08-29)
  // -------------------------------------------------------------------------
  //
  // The phase sign-off's machinery is reused wholesale — nomination by the Lead,
  // authenticator step-up, single-use StepUpProof, snapshotted role and signature
  // image, withdrawal by the signer alone with a mandatory reason. What is NEW
  // here is everything question 29 adds: the market lane, the Preparer -> Reviewer
  // -> Approver sequence, independence, the ten-decision comment rule, the
  // gate-scoped evidence snapshot, and the approver's decision BEING the gate
  // decision.
  //
  // Rows are created lazily (`upsert`) rather than scaffolded: the per-market
  // lanes depend on a market list that changes during the project.

  // The proof is bound to the CONTENT the signer was shown (its hash), so a code entered for one
  // version of the evidence cannot sign another.
  private gateSignOffStepUpPurpose(
    id: string,
    gateId: string,
    market: string | undefined,
    role: string,
    contentHash: string,
  ): string {
    return `gate_sign_off:${id}:${gateId}:${market ?? ''}:${role}:${contentHash}`;
  }

  private gateContentHash(snapshot: ReturnType<typeof gateEvidenceSnapshot>): string {
    return createHash('sha256').update(canonicalJson(gateSnapshotSignedPart(snapshot))).digest('hex');
  }

  // What the signer reads before signing: the whole gate snapshot and the hash their signature will
  // be bound to. Read-only — nothing is written, and any signed-in user may read project data.
  async previewGateSignOff(id: string, gateId: string, market: string | undefined): Promise<GateSigningPreview> {
    const row = await this.loadOrThrow(this.prisma, id);
    const project = toProjectData(row, [], await this.loadReference(this.prisma));
    this.assertGateLane(project, gateId, market);
    const snapshot = gateEvidenceSnapshot(project, gateId, market);
    return {
      gateId,
      ...(market ? { market } : {}),
      hash: this.gateContentHash(snapshot),
      previewedAt: new Date().toISOString(),
      snapshot,
    };
  }

  // The content a signature attested to, as it was when signed — also for a signature since withdrawn. Read-only, any
  // signed-in user who may read the project. A signature given before the content began to be kept has none.
  async signedGateContent(
    id: string,
    gateId: string,
    market: string | undefined,
    role: string,
    signedAt: string,
  ): Promise<GateSignedContent> {
    await this.loadOrThrow(this.prisma, id);
    const row = await this.prisma.auditEvent.findFirst({
      where: {
        projectId: id,
        action: 'gate_sign_off.content',
        AND: [
          { after: { path: ['gateId'], equals: gateId } },
          { after: { path: ['role'], equals: role } },
          { after: { path: ['signedAt'], equals: signedAt } },
          ...(market ? [{ after: { path: ['market'], equals: market } }] : []),
        ],
      },
      orderBy: { occurredAt: 'desc' },
    });
    if (!row) throw new NotFoundException('The content of this signature was not kept (it was given before signed content was recorded)');
    const a = row.after as unknown as { contentHash: string; snapshot: GateSignedContent['snapshot'] };
    return { gateId, ...(market ? { market } : {}), role, signedAt, hash: a.contentHash, snapshot: a.snapshot };
  }

  // A lane must be one the project actually has. Without this a caller could sign
  // Gate 10 for a market this project does not sell into, and that signature would
  // sit in the table forever satisfying nothing — or worse, a market-less Gate 10
  // signature would look like it covered every market.
  private assertGateLane(project: ProjectData, gateId: string, market: string | undefined): void {
    if (!GATES.some((g) => g.id === gateId)) throw new BadRequestException(`Unknown gate "${gateId}"`);
    const lanes = gateSignOffMarkets(project, gateId);
    if (!lanes.some((m: string | undefined) => m === market)) {
      throw new BadRequestException(
        isPerMarketGate(gateId)
          ? `${gateId} is signed off per market (question 18) — "${market ?? '(none)'}" is not a market on this project`
          : `${gateId} is not signed off per market — omit the market`,
      );
    }
  }

  private async loadGateSignOffs(
    tx: Prisma.TransactionClient,
    id: string,
    gateId: string,
    market: string | undefined,
  ) {
    // F4: a per-market lane belongs to the CURRENT formula version.
    const formulaVersionId = market ? await this.currentVersionId(tx, id) : null;
    return tx.gateSignOff.findMany({ where: { projectId: id, gateId, market: market ?? null, formulaVersionId } });
  }

  // The newest formula version — the current one (F4/Q2).
  private async currentVersionId(tx: Prisma.TransactionClient, projectId: string): Promise<string | null> {
    const v = await tx.formulaVersion.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    return v?.id ?? null;
  }

  // Question 29(5): "Preparer confirms the record is complete and recommends a
  // decision · Reviewer confirms the evidence and records a recommendation ·
  // Approver records the final gate decision." An order, not a list.
  private assertSequence(rows: { role: string; signedAt: Date | null }[], role: GateSignOffRole): void {
    const previous = previousGateSignOffRole(role);
    if (!previous) return;
    const before = rows.find((r) => r.role === previous);
    if (!before?.signedAt) {
      throw new BadRequestException(`"${previous}" must be signed before "${role}" — the sequence is fixed`);
    }
  }

  // Question 29(4). Two rules, and they are deliberately different in strength:
  //
  //   every gate    — "the reviewer must be a different authenticated person from
  //                   the preparer". A person may not review their own work.
  //   critical gate — "at least one reviewer or approver must ALSO represent the
  //                   relevant independent function", expressed as a capability so
  //                   the Role Editor stays where authority is granted.
  //
  // The human-study workflow keeps its stricter outside-department rule (C2); the
  // answer says so explicitly, and nothing here touches it.
  //
  // NARROWED BACK on 2026-10-05 (project owner: if the review team did not say it,
  // do not enforce it). Two further pairs used to be refused here —
  // approver != preparer and approver != reviewer — which together forced THREE
  // distinct people on every one of the twelve gates. Neither appears in any
  // answer: 29(4) names only reviewer != preparer, and D1 says the opposite way
  // ("where risk is low the same person may prepare several gate records").
  //
  // What removing them permits, stated plainly because it is not obvious: the
  // approver may now be the same person as the preparer, i.e. somebody can approve
  // the gate they prepared, and the approver's decision IS the gate decision. That
  // is a real loosening of a control, taken deliberately rather than by oversight.
  // [ASSUMPTION: R5-Q56]
  private async assertIndependence(
    user: SessionUser,
    gateId: string,
    role: GateSignOffRole,
    rows: { role: string; signedByUserId: string | null }[],
  ): Promise<void> {
    // The one pair question 29(4) actually names.
    if (role === 'Reviewed by') {
      const preparer = rows.find((r) => r.role === 'Prepared by')?.signedByUserId;
      if (preparer && preparer === user.id) {
        throw new ForbiddenException(
          `You signed "Prepared by" on this gate — the reviewer must be a different person`,
        );
      }
    }
    const required = INDEPENDENT_FUNCTION_BY_GATE[gateId];
    // Checked at the APPROVER's step only, and that is not a relaxation — the rule
    // is about a SET ("at least one reviewer OR approver"), and the set is not
    // complete until the last of the two signs. Checking it at the reviewer's step
    // would demand the capability of the reviewer alone, since no approver has
    // signed yet — which would silently convert "one of the two" into "both", and
    // make a Quality reviewer plus a Safety approver impossible at Gate 7.
    if (!required || role !== 'Approved by') return;
    const mine = await this.holdsAnyCapability(user, required.anyOf);
    if (mine) return;
    const other = rows.find((r) => r.role === 'Reviewed by' && r.signedByUserId);
    if (other?.signedByUserId) {
      // Loaded with the SAME include SessionUser is defined by, so the capability
      // check runs over a real user record rather than a hand-built lookalike —
      // `hasPermission` reads `active` and `roles[].roleId`, and a partial object
      // would silently answer "no".
      const otherUser = await this.prisma.user.findUnique({
        where: { id: other.signedByUserId },
        include: { department: true, roles: { include: { role: true } } },
      });
      if (otherUser && (await this.holdsAnyCapability(otherUser, required.anyOf))) return;
    }
    throw new ForbiddenException(
      `${gateId} is a critical gate: its reviewer or approver must represent ${required.label} ` +
        `(needs one of ${required.anyOf.join(' or ')}) — neither you nor the reviewer holds it`,
    );
  }

  private async holdsAnyCapability(user: SessionUser, capabilities: string[]): Promise<boolean> {
    for (const capability of capabilities) {
      const [resource, action] = capability.split('|');
      if (await this.permissions.hasPermission(user, resource, action)) return true;
    }
    return false;
  }

  // The Lead nominates who signs each role of a gate lane, exactly as for the
  // phase block. A signed row cannot be reassigned — withdraw it first.
  async setGateSignOffAssignees(
    user: SessionUser,
    id: string,
    gateId: string,
    market: string | undefined,
    assignees: Partial<Record<GateSignOffRole, string | null>>,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'gate_sign_off.assigned', async (tx, _row, project) => {
      this.assertGateLane(project, gateId, market);
      if (project.identity.projectLead !== user.displayName && !this.permissions.isAdmin(user)) {
        throw new ForbiddenException(`Only the project's Lead (${project.identity.projectLead}) may nominate signers`);
      }
      const existing = await this.loadGateSignOffs(tx, id, gateId, market);

      // Critical gates (project owner, 2026-10-15): the Lead names the independent-function representative FIRST, and that person
      // takes the Reviewed by or Approved by slot. Until then neither slot can be nominated; once named, that slot is theirs and is
      // changed only through the representative route.
      if (CRITICAL_GATES.includes(gateId)) {
        const rep = existing.find((r: { representsFunction: string | null; assignedToUserId: string | null }) => r.representsFunction && r.assignedToUserId);
        for (const role of ['Reviewed by', 'Approved by'] as const) {
          if (!(role in assignees)) continue;
          if (!rep) {
            throw new BadRequestException(
              `${gateId} is a critical gate: name the person who represents the independent function first, then nominate "${role}"`,
            );
          }
          if (rep.role === role) {
            throw new BadRequestException(`"${role}" is held by the function representative — change it in the representative block`);
          }
        }
        if (rep && assignees['Prepared by'] && assignees['Prepared by'] === rep.assignedToUserId) {
          throw new BadRequestException('The function representative cannot also be "Prepared by"');
        }
      }

      // Question 29(4)'s one stated pair, applied to the MERGED state: whoever
      // would end up on "Reviewed by" must not be whoever is on "Prepared by",
      // counting a signature as well as a nomination. Refusing it now spares the
      // nominee discovering it at the authenticator prompt.
      const wouldBe = (role: GateSignOffRole): string | null => {
        if (role in assignees) return assignees[role] ?? null;
        const row = existing.find((r: { role: string }) => r.role === role);
        return row?.signedByUserId ?? row?.assignedToUserId ?? null;
      };
      const preparer = wouldBe('Prepared by');
      const reviewer = wouldBe('Reviewed by');
      if (preparer && reviewer && preparer === reviewer) {
        const who = await tx.user.findUnique({ where: { id: preparer }, select: { displayName: true } });
        throw new BadRequestException(
          `${who?.displayName ?? 'That person'} cannot be both "Prepared by" and "Reviewed by" on the same gate — the reviewer must be a different person`,
        );
      }

      for (const [role, userId] of Object.entries(assignees) as [GateSignOffRole, string | null][]) {
        if (!(GATE_SIGNOFF_ROLES as readonly string[]).includes(role)) {
          throw new BadRequestException(`Unknown sign-off role "${role}"`);
        }
        const current = existing.find((r: { role: string; signedAt: Date | null }) => r.role === role);
        if (current?.signedAt) {
          throw new BadRequestException(`"${role}" is already signed — withdraw the signature before reassigning`);
        }
        if (userId) {
          const exists = await tx.user.findUnique({ where: { id: userId }, select: { id: true, active: true } });
          if (!exists?.active) throw new BadRequestException('The nominated signer is not an active user');
        }
        // findFirst + create/update rather than `upsert`: Prisma types a compound
        // unique's nullable member as non-null, so the market-less lane (Gates
        // 1-9, where `market` IS NULL) cannot be addressed through it at all. The
        // uniqueness itself is enforced by the two indexes in the migration.
        if (current) {
          await tx.gateSignOff.update({ where: { id: current.id }, data: { assignedToUserId: userId } });
        } else {
          await tx.gateSignOff.create({
            data: {
              projectId: id,
              gateId,
              market: market ?? null,
              formulaVersionId: market ? await this.currentVersionId(tx, id) : null,
              role,
              assignedToUserId: userId,
            },
          });
        }
      }
      return { gateId, market: market ?? null, roles: Object.keys(assignees) };
    });
  }

  // Critical gates: the Lead names the person who represents the gate's independent function and the slot they fill (Reviewed by or
  // Approved by). Round 4 question 29(4): "at least one reviewer or approver must also represent the relevant independent function".
  // The candidate must hold the matching represent-* capability, must not be the preparer, and the slot stays theirs until the Lead
  // changes it (a signature already given must be withdrawn first). Passing userId null clears the nomination.
  async setGateRepresentative(
    user: SessionUser,
    id: string,
    gateId: string,
    market: string | undefined,
    input: { userId: string | null; slot?: GateSignOffRole; function?: string },
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'gate_sign_off.representative', async (tx, _row, project) => {
      this.assertGateLane(project, gateId, market);
      if (project.identity.projectLead !== user.displayName && !this.permissions.isAdmin(user)) {
        throw new ForbiddenException(`Only the project's Lead (${project.identity.projectLead}) may name the function representative`);
      }
      if (!CRITICAL_GATES.includes(gateId)) {
        throw new BadRequestException(`${gateId} has no independent-function representative (only the critical gates do)`);
      }
      const rows = await this.loadGateSignOffs(tx, id, gateId, market);
      type Row = (typeof rows)[number];
      const current = rows.find((r: Row) => r.representsFunction && r.assignedToUserId);
      const free = async (row: Row) => {
        if (row.signedAt) {
          throw new BadRequestException(`"${row.role}" is already signed — withdraw the signature before changing the representative`);
        }
        await tx.gateSignOff.update({ where: { id: row.id }, data: { assignedToUserId: null, representsFunction: null } });
      };
      if (!input.userId) {
        if (current) await free(current);
        return { gateId, market: market ?? null, cleared: true };
      }
      const slot = input.slot;
      if (slot !== 'Reviewed by' && slot !== 'Approved by') {
        throw new BadRequestException('Say which signature the representative gives: "Reviewed by" or "Approved by"');
      }
      const allowed = independentFunctionsForGate(gateId);
      const candidate = await tx.user.findUnique({
        where: { id: input.userId },
        include: { department: true, roles: { include: { role: true } } },
      });
      if (!candidate?.active) throw new BadRequestException('The representative is not an active user');
      const held: string[] = [];
      for (const fn of allowed) {
        if (await this.holdsAnyCapability(candidate, [INDEPENDENT_FUNCTIONS[fn].capability])) held.push(fn);
      }
      const fn = input.function ?? held[0];
      if (!fn || !allowed.includes(fn) || !held.includes(fn)) {
        const labels = allowed.map((f) => INDEPENDENT_FUNCTIONS[f].label).join(' or ');
        throw new BadRequestException(`${candidate.displayName} does not represent ${labels} — pick someone who holds that function`);
      }
      const preparer = rows.find((r: Row) => r.role === 'Prepared by');
      if ((preparer?.signedByUserId ?? preparer?.assignedToUserId) === candidate.id) {
        throw new BadRequestException(`${candidate.displayName} is "Prepared by" on this gate and cannot also represent the independent function`);
      }
      // The previous representative's slot (if it is the other one) is freed; the target slot must be unsigned.
      if (current && current.role !== slot) await free(current);
      const target = rows.find((r: Row) => r.role === slot);
      if (target?.signedAt) {
        throw new BadRequestException(`"${slot}" is already signed — withdraw the signature before changing the representative`);
      }
      if (target) {
        await tx.gateSignOff.update({ where: { id: target.id }, data: { assignedToUserId: candidate.id, representsFunction: fn } });
      } else {
        await tx.gateSignOff.create({
          data: {
            projectId: id,
            gateId,
            market: market ?? null,
            formulaVersionId: market ? await this.currentVersionId(tx, id) : null,
            role: slot,
            assignedToUserId: candidate.id,
            representsFunction: fn,
          },
        });
      }
      return { gateId, market: market ?? null, slot, function: fn, representative: candidate.displayName };
    });
  }

  async verifyGateSignOffStepUp(
    user: SessionUser,
    id: string,
    gateId: string,
    market: string | undefined,
    role: GateSignOffRole,
    code: string,
    expectedHash: string,
  ): Promise<{ stepUpToken: string }> {
    if (!expectedHash) throw new BadRequestException('expectedHash is required — open the signing preview first');
    const existing = await this.prisma.gateSignOff.findFirst({
      where: {
        projectId: id,
        gateId,
        market: market ?? null,
        formulaVersionId: market ? await this.currentVersionId(this.prisma, id) : null,
        role,
      },
    });
    if (!existing) throw new NotFoundException(`"${role}" has no nominated signer on ${gateId} yet`);
    if (existing.signedAt) throw new BadRequestException(`"${role}" is already signed — withdraw it first`);
    if (existing.assignedToUserId !== user.id) {
      throw new ForbiddenException(`"${role}" is assigned to somebody else — only the assigned signer may sign it`);
    }
    const signature = await this.prisma.userSignature.findUnique({ where: { userId: user.id } });
    if (!signature) throw new BadRequestException('Save a signature in My Account before signing');
    await this.totp.verifyForStepUp(user.id, code);
    const purpose = this.gateSignOffStepUpPurpose(id, gateId, market, role, expectedHash);
    const proof = await this.prisma.stepUpProof.create({ data: { userId: user.id, purpose, channel: 'totp' } });
    const stepUpToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'gate_sign_off_step_up', proof: proof.id, purpose },
      { expiresIn: '5m' },
    );
    return { stepUpToken };
  }

  async signGateSignOff(
    user: SessionUser,
    id: string,
    gateId: string,
    market: string | undefined,
    role: GateSignOffRole,
    input: {
      decision?: string;
      comment?: string;
      stepUpToken?: string;
      expectedHash?: string;
      // What the signer was shown and when. Used ONLY to word a refusal (what changed, who by); the
      // hash alone decides, and a snapshot that does not hash to `expectedHash` is ignored.
      seen?: { snapshot?: ReturnType<typeof gateEvidenceSnapshot>; previewedAt?: string };
    },
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, null, 'gate_sign_off.signed', async (tx, _row, project) => {
      this.assertGateLane(project, gateId, market);
      // B4 (SME rule audit, 2026-10-04): a sign-off is part of working the gate,
      // so it follows the same lock as every other gate edit — only the gate open
      // for work, and a passed gate is corrected through Backtrack.
      if (!isGateUnlocked(project, gateId)) {
        throw new ForbiddenException(
          `Gate ${gateId} is not the gate currently open for work — it cannot be signed (a passed gate is reopened with Backtrack)`,
        );
      }
      const rows = await this.loadGateSignOffs(tx, id, gateId, market);
      // Critical gates: nobody signs until the independent-function representative is named (project owner, 2026-10-15).
      const missingRep = representativeMissingReason(project, gateId, market);
      if (missingRep) throw new BadRequestException(missingRep);
      const existing = rows.find((r) => r.role === role);
      if (!existing) throw new NotFoundException(`"${role}" has no nominated signer on ${gateId} yet`);
      if (existing.signedAt) {
        throw new BadRequestException(`"${role}" was already signed by ${existing.name ?? 'another user'} — withdraw it first`);
      }
      if (!existing.assignedToUserId) {
        throw new BadRequestException(`"${role}" has no assigned signer yet — the project's Lead assigns one`);
      }
      if (existing.assignedToUserId !== user.id) {
        throw new ForbiddenException(`"${role}" is assigned to somebody else — only the assigned signer may sign it`);
      }
      this.assertSequence(rows, role);
      await this.assertIndependence(user, gateId, role, rows);

      const decision = input.decision?.trim();
      if (!decision) throw new BadRequestException('A decision is required to sign');
      if (!(GATE_DECISIONS as readonly string[]).includes(decision)) {
        throw new BadRequestException(`"${decision}" is not a valid decision`);
      }
      // Guard parity with the signing panel: a passing signature attests the gate's work is done, and
      // the stage status is inside the signed snapshot — so signing Proceed while it still reads
      // In Progress and completing it afterwards would turn all three signatures stale. The panel
      // already holds this back; the server must refuse it too (SW-9). [ASSUMPTION: R5-Q55]
      const stage = project.gates.find((g) => g.gateId === gateId);
      if (GATE_PASSING_DECISIONS.includes(decision) && stage && stage.status !== 'Complete') {
        throw new BadRequestException(
          `The stage status of ${gateId} is "${stage.status}" — save it as Complete before a "${decision}" signature`,
        );
      }
      // The Phase Gate Flow card is complete BEFORE a passing signature (SW-26): the owner, due date and
      // evidence link are inside the signed snapshot, so filling them in afterwards would turn every
      // signature stale — and the owner asked for the data to be there first.
      const flowMissing = gateFlowMissing(project, gateId);
      if (GATE_PASSING_DECISIONS.includes(decision) && flowMissing.length > 0) {
        throw new BadRequestException(
          `The Phase Gate Flow of ${gateId} is incomplete — save ${flowMissing.join(', ')} before a "${decision}" signature`,
        );
      }
      // Question 29(2): the ten decisions that require a comment, by name rather
      // than by "anything except Proceed" — four of the ten are decisions this
      // enum does not carry yet, and naming them now means adding one later
      // cannot silently skip the rule.
      const comment = input.comment?.trim();
      if (gateSignOffNeedsComment(decision) && !comment) {
        throw new BadRequestException(`A comment is required when the decision is "${decision}"`);
      }
      // Question 29(5): "the approver's decision IS the gate decision … the gate
      // passes only when the approver records Proceed or Proceed with
      // Conditions." So the approver signing is the act that records the gate
      // decision, and it goes through the SAME B1/F9/F1 guards a direct decision
      // would — otherwise signing would be a way around them.
      if (role === 'Approved by') {
        // The nominated approver signing IS the decision (q29(5)); being nominated is the authority, so no further check.
        const gate = project.gates.find((g) => g.gateId === gateId);
        if (!gate) throw new NotFoundException(`Gate ${gateId} not found`);
        // Evaluated against the project AS IT WILL BE once this signature exists.
        //
        // Without that, the guard deadlocks by construction: one of the gate's own
        // Mandatory readiness items is "Prepared, reviewed and approved sign-off",
        // and the approval being recorded here is the third of those three
        // signatures — so the approver could never record Proceed, because the
        // thing that would satisfy the item is the act being validated. This is
        // exactly the loop `Post_Round3_Design_Decisions.md` §1 point 5 flagged,
        // and question 29(5) resolves it: "the approver's decision IS the gate
        // decision — no separate duplicate decision after approval."
        //
        // Only THIS lane's row is added. On a per-market gate the other markets'
        // lanes stay unsigned and go on blocking, which is question 18's whole
        // point: one approved market must not make the rest look ready.
        const pending: ProjectData = {
          ...project,
          gateSignOffs: [
            ...project.gateSignOffs.filter(
              (sofar) =>
                !(
                  sofar.gateId === gateId &&
                  (sofar.market ?? undefined) === market &&
                  sofar.role === role &&
                  (!market || sofar.formulaVersion === project.formulaVersion)
                ),
            ),
            {
              gateId,
              ...(market ? { market, formulaVersion: project.formulaVersion } : {}),
              role,
              signedByUserId: user.id,
              signedAt: new Date().toISOString(),
              decision: decision as GateRecord['decision'],
            },
          ],
        };
        // B7 (SME rule audit, 2026-10-04): the approver's path skipped the
        // authority check the dropdown path runs for Proceed with Conditions —
        // carrying a flagged watch-list finding (question 32(c)) or an open
        // change's Gate 11 impact (question 34(d)) needs the matching authority
        // whichever way the decision is recorded.
        await this.assertCanCarryConditions(user, pending, gateId, decision as GateRecord['decision']);
        // B2 (SME rule audit, 2026-10-04): on a per-market gate the OTHER markets'
        // lanes are not this approver's to sign, so their being unsigned must not
        // refuse this lane's approval — Vietnam could not record Proceed while
        // Australia was still open. Every other readiness item still applies.
        const otherLanesOpen =
          isPerMarketGate(gateId) &&
          gateSignOffMarkets(pending, gateId).some(
            (m) =>
              m !== market &&
              !GATE_PASSING_DECISIONS.includes(
                (findGateSignOff(pending, gateId, m, 'Approved by')?.signedAt
                  ? findGateSignOff(pending, gateId, m, 'Approved by')?.decision
                  : undefined) ?? '',
              ),
          );
        this.resolveDecision(
          pending,
          [],
          gateId,
          gate,
          decision as GateRecord['decision'],
          { ...gate, decision: decision as GateRecord['decision'] },
          await this.openChangeGateNumbers(tx, id),
          true,
          otherLanesOpen ? this.signOffItemIds(gateId) : [],
          market,
        );
      }

      // The signer signs what they were SHOWN. Compared here, inside the row-locked transaction, so
      // the content cannot change between this check and the write. Other people's edits elsewhere
      // do not matter — only the part of the snapshot this signature is accountable for is hashed.
      const snapshot = gateEvidenceSnapshot(project, gateId, market);
      if (!input.expectedHash) {
        throw new BadRequestException('expectedHash is required — open the signing preview first');
      }
      if (this.gateContentHash(snapshot) !== input.expectedHash) {
        const seen = input.seen?.snapshot;
        const seenValid = seen !== undefined && this.gateContentHash(seen) === input.expectedHash;
        const changes = seenValid ? describeGateContentChanges(seen, snapshot) : [];
        const since = input.seen?.previewedAt ? new Date(input.seen.previewedAt) : undefined;
        const edits =
          since && !Number.isNaN(since.getTime())
            ? await tx.auditEvent.findMany({
                where: { projectId: id, occurredAt: { gt: since }, actorId: { not: user.id } },
                include: { actor: { select: { displayName: true } } },
                orderBy: { occurredAt: 'asc' },
                take: 50,
              })
            : [];
        const seenBy = new Set<string>();
        const editedBy = edits
          .map((e) => ({ by: e.actor?.displayName ?? 'someone', action: e.action, at: e.occurredAt.toISOString() }))
          .filter((e) => {
            const key = `${e.by}|${e.action}`;
            if (seenBy.has(key)) return false;
            seenBy.add(key);
            return true;
          });
        throw new UnprocessableEntityException({
          code: 'GATE_CONTENT_CHANGED',
          message: 'The evidence for this gate changed after you opened the signing preview — review it again before signing.',
          changes,
          editedBy,
        });
      }

      let signatureImage: string | null = null;
      {
        if (!input.stepUpToken) {
          throw new BadRequestException('An authenticator code is required to sign');
        }
        let payload: { sub?: string; typ?: string; proof?: string; purpose?: string };
        try {
          payload = await this.jwt.verifyAsync(input.stepUpToken);
        } catch {
          throw new BadRequestException('Verification expired or invalid — enter a new code');
        }
        const expectedPurpose = this.gateSignOffStepUpPurpose(id, gateId, market, role, input.expectedHash);
        if (payload.typ !== 'gate_sign_off_step_up' || payload.sub !== user.id || payload.purpose !== expectedPurpose) {
          throw new BadRequestException('Verification does not match this sign-off');
        }
        const proof = payload.proof ? await tx.stepUpProof.findUnique({ where: { id: payload.proof } }) : null;
        if (!proof || proof.userId !== user.id || proof.usedForId) {
          throw new BadRequestException('Verification already used or invalid — enter a new code');
        }
        const signature = await tx.userSignature.findUnique({ where: { userId: user.id } });
        if (!signature) {
          throw new BadRequestException('Save a signature in My Account before signing');
        }
        await tx.stepUpProof.update({ where: { id: proof.id }, data: { usedForId: existing.id } });
        signatureImage = signature.imageData;
      }

      // Question 29(1). Taken here, inside the row-locked transaction, so it is
      // exactly the evidence that existed at the moment of signing — and stored in
      // full, because the answer requires the system to say what changed later.
      const now = new Date();
      await tx.gateSignOff.update({
        where: { id: existing.id },
        data: {
          name: user.displayName,
          initials: this.initialsOf(user.displayName),
          signedByUserId: user.id,
          signedAt: now,
          roleAtSigning: user.roles.map((r) => r.role.name).join(', ') || null,
          decision,
          comment: comment || null,
          signatureImage,
          signatureVerifiedAt: now,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });

      // The approver's decision IS the gate decision — written here rather than
      // left for somebody to record separately, which is what "no separate
      // duplicate decision after approval" means.
      // B2: on a per-market gate each lane's approver decides THAT market, and
      // they used to overwrite one shared gate decision — Australia's Hold then
      // Vietnam's Proceed left the gate reading Proceed. The gate decision is now
      // the roll-up of every lane, written only once every lane's approver has
      // signed: Proceed with Conditions if any lane carries conditions, Proceed
      // if all are Proceed, otherwise the first non-passing lane's decision.
      let gateDecision: string | null | undefined;
      if (role === 'Approved by') {
        gateDecision = decision;
        if (isPerMarketGate(gateId)) {
          const lanes = gateSignOffMarkets(project, gateId);
          const laneDecision = (m: string | undefined) =>
            m === market
              ? decision
              : (() => {
                  // F4: the current formula version's lane only.
                  const lane = findGateSignOff(project, gateId, m, 'Approved by');
                  return lane?.signedAt ? lane.decision : undefined;
                })();
          const decisions = lanes.map(laneDecision);
          if (decisions.some((d) => !d)) gateDecision = null;
          else if (decisions.every((d) => GATE_PASSING_DECISIONS.includes(d!))) {
            gateDecision = decisions.includes('Proceed with Conditions') ? 'Proceed with Conditions' : 'Proceed';
          } else gateDecision = decisions.find((d) => !GATE_PASSING_DECISIONS.includes(d!))!;
        }
        await tx.gateRecord.update({
          where: { projectId_gateId: { projectId: id, gateId } },
          data: { decision: gateDecision },
        });
      }
      // C10 (SME rule audit, 2026-10-04): F9's acknowledgement of open change
      // controls used to be a browser dialog that appended a line to the gate's
      // editable notes. The approver's signature is the act that records the
      // decision now, so it records — on this immutable audit row — which open
      // changes affecting the gate it was given with. A plain Proceed with one
      // open is already refused (F9), so these accompany Proceed with Conditions,
      // whose comment is mandatory.
      const gateNumber = GATES.find((g) => g.id === gateId)?.number ?? '';
      const acceptedOpenChanges =
        role === 'Approved by'
          ? openChangesAffectingGate(project.changes, project.identity.id, gateNumber).map((c) => c.changeId)
          : [];
      // The content itself, in its own audit row: it is large, and the History list must not load it on every read. Kept
      // so it can still be opened after the signature is withdrawn and the row wiped.
      await this.audit.record(
        {
          actorId: user.id,
          projectId: id,
          entityType: 'gate_sign_off_content',
          entityId: existing.id,
          action: 'gate_sign_off.content',
          after: {
            gateId,
            market: market ?? null,
            role,
            signedAt: now.toISOString(),
            contentHash: this.gateContentHash(snapshot),
            snapshot,
          } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
      return {
        gateId,
        market: market ?? null,
        role,
        decision,
        // The whole of what was signed, kept so the gate's history can show it after a withdrawal has wiped the row.
        comment: comment || null,
        contentHash: this.gateContentHash(snapshot),
        signedAt: now.toISOString(),
        gateDecisionRecorded: role === 'Approved by',
        gateDecision: gateDecision ?? null,
        acceptedOpenChanges,
      };
    });
  }

  // Only the signer (or an admin, for the case where that account is gone) may
  // release a signature, and a reason is mandatory — B4, no silent corrections.
  // The nomination survives, exactly as for the phase block.
  async withdrawGateSignOff(
    user: SessionUser,
    id: string,
    gateId: string,
    market: string | undefined,
    role: GateSignOffRole,
    reason: string,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const why = reason?.trim();
    if (!why) throw new BadRequestException('A reason is required to withdraw a signature');
    return this.mutate(user, id, expectedVersion, 'gate_sign_off.withdrawn', async (tx, _row, project) => {
      this.assertGateLane(project, gateId, market);
      const rows = await this.loadGateSignOffs(tx, id, gateId, market);
      const existing = rows.find((r) => r.role === role);
      if (!existing?.signedAt) throw new BadRequestException(`"${role}" is not signed`);
      // B4 (SME rule audit, 2026-10-04): withdrawing the approval of a gate that
      // has passed un-passed it with no Backtrack and no reopened range.
      if (isGatePassed(project, gateId)) {
        throw new ForbiddenException(
          `Gate ${gateId} has passed — its signatures cannot be withdrawn; reopen it with Backtrack`,
        );
      }
      if (existing.signedByUserId !== user.id && !this.permissions.isAdmin(user)) {
        throw new ForbiddenException(`Only ${existing.name ?? 'the signer'} may withdraw this signature`);
      }
      // The sequence runs the other way too: releasing the preparer's signature
      // while a reviewer's still stands would leave a review of nothing. Later
      // signatures must be withdrawn first, by the people who gave them.
      const later = GATE_SIGNOFF_ROLES.slice(GATE_SIGNOFF_ROLES.indexOf(role) + 1);
      const standing = rows.filter((r) => later.includes(r.role as GateSignOffRole) && r.signedAt);
      if (standing.length > 0) {
        throw new BadRequestException(
          `Withdraw ${standing.map((r) => `"${r.role}"`).join(' and ')} first — a later signature rests on this one`,
        );
      }
      await tx.gateSignOff.update({
        where: { id: existing.id },
        data: {
          name: null,
          initials: null,
          signedByUserId: null,
          signedAt: null,
          roleAtSigning: null,
          decision: null,
          comment: null,
          signatureImage: null,
          signatureVerifiedAt: null,
          snapshot: Prisma.DbNull,
        },
      });
      // Withdrawing the approval un-records the gate decision it WAS — leaving it
      // would keep a decision on the gate that nobody currently stands behind.
      if (role === 'Approved by') {
        await tx.gateRecord.update({
          where: { projectId_gateId: { projectId: id, gateId } },
          data: { decision: null },
        });
      }
      return {
        gateId,
        market: market ?? null,
        role,
        reason: why,
        previousSigner: existing.name ?? null,
        // What is being withdrawn: the row is wiped just above, so the audit is the only record of it.
        previousDecision: existing.decision ?? null,
        previousComment: existing.comment ?? null,
        previousSignedAt: existing.signedAt.toISOString(),
      };
    });
  }

  async setEvidenceSummary(
    user: SessionUser,
    id: string,
    phase: number,
    value: string,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'evidence_summary.updated', async (tx, _row, project) => {
      this.assertPhaseDataOpen(project, phase);
      await tx.phaseClosure.update({
        where: { projectId_phase: { projectId: id, phase } },
        data: { evidenceSummary: value },
      });
      return { phase };
    });
  }

  // The phase banner's "(provide link here)" shortcuts. Replaces the whole set
  // for that phase — the card saves every row at once, like every other table.
  // No gate lock: these point at where the work lives, they are not gate
  // evidence, so an old phase's link can still be corrected. `assertMutable`
  // (inside mutate) still refuses an archived project.
  async setPhaseKeyLinks(
    user: SessionUser,
    id: string,
    phase: number,
    links: Record<string, string>,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'phase_key_links.updated', async (tx) => {
      const closure = await tx.phaseClosure.findUniqueOrThrow({
        where: { projectId_phase: { projectId: id, phase } },
        select: { id: true },
      });
      await tx.phaseKeyLink.deleteMany({ where: { phaseClosureId: closure.id } });
      const rows = Object.entries(links)
        .map(([label, url]) => ({ phaseClosureId: closure.id, label, url: url.trim() }))
        .filter((r) => r.url !== '');
      if (rows.length > 0) await tx.phaseKeyLink.createMany({ data: rows });
      return { phase, links: rows.length };
    });
  }

  // F13: the responsible owner accepts a phase's pre-work. The acceptor is the
  // session user, not a client-supplied name.
  async acceptPreWork(
    user: SessionUser,
    id: string,
    phase: number,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'pre_work.accepted', async (tx, _row, project) => {
      // C4 (SME rule audit, 2026-10-04). F13: pre-work is reviewed and accepted
      // "by the responsible owner once the phase opens". Both halves were missing:
      // anyone could accept, and could do it while the phase was still locked —
      // i.e. before there was anything for an owner to review.
      this.assertPhaseDataOpen(project, phase);
      if (phaseProgress(project, phase).state === 'locked') {
        throw new BadRequestException(`Phase ${phase} is not open yet (the phase before it is still in progress) — its pre-work can be accepted once it opens (F13)`);
      }
      // Who the "responsible owner" is: the phase's review owner on this project,
      // or the project's Lead [ASSUMPTION: R5-Q43].
      const phaseOwner = ownerName(PHASE_CONFIGS[phase]?.reviewOwner, project.identity.reviewers);
      if (
        user.displayName !== phaseOwner &&
        user.displayName !== project.identity.projectLead &&
        !this.permissions.isAdmin(user)
      ) {
        throw new ForbiddenException(
          `Only the phase's review owner (${phaseOwner ?? 'not assigned'}) or the project's Lead may accept its pre-work (F13)`,
        );
      }
      await tx.phaseClosure.update({
        where: { projectId_phase: { projectId: id, phase } },
        data: { preWorkAcceptedBy: user.displayName, preWorkAcceptedDate: new Date() },
      });
      return { phase, acceptedBy: user.displayName };
    });
  }

  // Round 4 question 16: the responsible reviewer assesses an auto-generated
  // "not applicable" reason on a CRITICAL readiness item before its gate closes by
  // acknowledging it. There is no way to record a refusal (removed 2026-11-05): an item
  // nobody has acknowledged simply stays blocked.
  // Who that is, and which items are critical, is our reading [ASSUMPTION: R5-Q6]
  // and lives in @mbc360/shared/utils/readinessAck.ts — this method only enforces it.
  //
  // ONE row per (gate, item), edited in place by whoever is the nominated reviewer
  // now (SW-29): a new reviewer overwrites the previous one's row, and the same
  // person may change their own. Nothing is deleted — the audit event carries the
  // row as it was and as it is now. The wording that is recorded is the one the
  // engine generates NOW, from the locked project row; the client sends only
  // (gate, item), so it cannot acknowledge wording it did not see, and the actor is
  // always the session user.
  async acknowledgeReadinessItem(
    user: SessionUser,
    id: string,
    gateId: string,
    itemId: string,
    functionKey: string,
    confirmClear: boolean,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'readiness_ack.recorded', async (tx, row, project) => {
      if (!GATES.some((g) => g.id === gateId)) throw new BadRequestException(`Unknown gate "${gateId}"`);
      if (isGatePassed(project, gateId)) {
        throw new BadRequestException(
          `${gateId} has already passed — its evidence is read-only. Backtrack to reopen it if an acknowledgement has to be corrected`,
        );
      }
      const item = gateReadinessChecklist(project, gateId).find((i) => i.id === itemId);
      if (!item?.acknowledgement) {
        throw new BadRequestException(
          `"${itemId}" is not waiting for an acknowledgement at ${gateId} — it is not a critical item whose "not applicable" was generated by the system`,
        );
      }
      // Who may acknowledge is whoever holds the FUNCTION the review team names for this item, on THIS project (Round 5
      // question 1). An administrator account, the Lead and the phase's "Reviewed by" have no standing of their own here.
      const slot = item.acknowledgement.slots.find((x) => x.functionKeys.includes(functionKey));
      if (!slot) {
        throw new BadRequestException(`"${functionKey}" is not one of the functions that acknowledge "${itemId}"`);
      }
      const functionLabel = REVIEW_ROLES.find((r) => r.key === functionKey)?.label ?? functionKey;
      const holder = await tx.projectReviewer.findUnique({ where: { projectId_roleKey: { projectId: id, roleKey: functionKey } } });
      if (!holder) {
        throw new BadRequestException(
          `Nobody is assigned as ${functionLabel} on this project yet, so nobody can acknowledge this — the project's Lead assigns one in Project team`,
        );
      }
      if (!holdsRole(holder, user)) {
        throw new ForbiddenException(`Only ${holder.name}, who holds ${functionLabel} on this project, may acknowledge this as ${functionLabel}`);
      }
      // Acknowledging "not applicable" on a table that exists only for the trigger clears what was entered in it (SW-56).
      // It is never silent: the caller must have confirmed (the screen asks first), and the audit event below carries
      // every cleared value, so nothing is lost from the record.
      const dedicated = generatedNaEntries(project).find((e) => e.gateId === gateId && e.itemId === itemId)?.dedicatedSection;
      const cleared: { requirement: string; was: Record<string, string | null> }[] = [];
      if (dedicated && dedicated.rowsWithData > 0) {
        if (!confirmClear) {
          throw new BadRequestException(
            `Acknowledging this clears the data entered in "${dedicated.title}" (${dedicated.rowsWithData} row${dedicated.rowsWithData === 1 ? '' : 's'} with data). Confirm to continue`,
          );
        }
        if (dedicated.kind === 'register') {
          // A register page: its entered columns go back to what an untouched row holds; the workbook's reference cells stay.
          if (isGateRefLocked(project, getRegisterConfig(dedicated.key)?.gate)) {
            throw new BadRequestException(`"${dedicated.title}" belongs to a gate that has passed, so it cannot be cleared (use Backtrack)`);
          }
          const stored = await tx.registerRow.findMany({ where: { projectId: id, registerKey: dedicated.key }, orderBy: { rowOrder: 'asc' } });
          const { rows: clearedRows, cleared: changes } = clearRegisterEnteredColumns(
            dedicated.key,
            stored.map((r) => r.data as RegisterRow),
          );
          for (const change of changes) {
            await tx.registerRow.update({
              where: { id: stored[change.rowIndex].id },
              data: { data: clearedRows[change.rowIndex] as Prisma.InputJsonValue, updatedById: user.id },
            });
            const label = (stored[change.rowIndex].data as RegisterRow).ingredientGroup;
            cleared.push({ requirement: typeof label === 'string' && label ? label : `Row ${change.rowIndex + 1}`, was: change.was });
          }
        }
        const rows = dedicated.kind === 'register' ? [] : row.requirementItems.filter((i) => i.sectionKey === dedicated.key);
        for (const target of rows) {
          // A row of a gate that has passed is not touched (that gate's evidence is locked).
          if (isGateRefLocked(project, target.gate)) continue;
          const had = {
            status: target.status,
            priority: target.priority,
            requirementText: target.requirementText,
            naRationale: target.naRationale,
            ynna: target.ynna,
            evidenceLink: target.evidenceLink,
            notes: target.notes,
          };
          const empty = target.status === 'Not Started' && !target.priority && !target.requirementText && !target.naRationale && !target.ynna && !target.evidenceLink && !target.notes;
          if (empty) continue;
          await tx.requirementItem.update({
            where: { id: target.id },
            data: { status: 'Not Started', priority: null, requirementText: null, naRationale: null, ynna: null, evidenceLink: null, notes: null },
          });
          cleared.push({ requirement: target.requirement, was: had });
        }
      }
      const before = slot.ack?.functionKey === functionKey ? slot.ack : undefined;
      const rationale = item.acknowledgement.rationale;
      if (before && before.rationale === rationale && before.acknowledgedByUserId === user.id) {
        throw new BadRequestException('Nothing to change — you have already acknowledged this');
      }
      const data = {
        rationale,
        basis: acknowledgementBasis(project),
        acknowledgedByUserId: user.id,
        acknowledgedByName: user.displayName,
        acknowledgedAs: functionLabel,
        acknowledgedAt: new Date(),
      };
      await tx.readinessAcknowledgement.upsert({
        where: { projectId_gateId_itemId_functionKey: { projectId: id, gateId, itemId, functionKey } },
        create: { projectId: id, gateId, itemId, functionKey, ...data },
        update: data,
      });
      // The audit event is the history of this row (nothing here is ever deleted), so it carries
      // what the row said before this edit as well as what it says now.
      return {
        gateId,
        itemId,
        functionKey,
        before: before
          ? { by: before.acknowledgedByName, at: before.acknowledgedAt, rationale: before.rationale }
          : null,
        after: { by: user.displayName, rationale },
        ...(cleared.length > 0 ? { cleared: { section: dedicated!.key, rows: cleared } } : {}),
      };
    });
  }

  // An acknowledgement taken back (project owner, 2026-11-06). Whoever gave it, or whoever now holds that function on the project,
  // may withdraw it, while its gate has not passed; an administrator's account has no standing here, as it has none to acknowledge.
  // The row goes (the item is waiting for an acknowledgement again) and the audit event keeps who gave it and when. Data cleared when
  // it was acknowledged is NOT restored: its earlier values are on that acknowledgement's audit event.
  async withdrawReadinessAcknowledgement(
    user: SessionUser,
    id: string,
    gateId: string,
    itemId: string,
    functionKey: string,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'readiness_ack.withdrawn', async (tx, _row, project) => {
      if (!GATES.some((g) => g.id === gateId)) throw new BadRequestException(`Unknown gate "${gateId}"`);
      if (isGatePassed(project, gateId)) {
        throw new BadRequestException(
          `${gateId} has already passed — its evidence is read-only. Backtrack to reopen it if an acknowledgement has to be withdrawn`,
        );
      }
      const key = { projectId_gateId_itemId_functionKey: { projectId: id, gateId, itemId, functionKey } };
      const existing = await tx.readinessAcknowledgement.findUnique({ where: key });
      if (!existing) throw new BadRequestException('There is no acknowledgement to withdraw');
      const holder = await tx.projectReviewer.findUnique({ where: { projectId_roleKey: { projectId: id, roleKey: functionKey } } });
      const mine = existing.acknowledgedByUserId === user.id || (!!holder && holdsRole(holder, user));
      if (!mine) {
        throw new ForbiddenException(
          `Only ${existing.acknowledgedByName}, who gave it, or whoever holds ${REVIEW_ROLES.find((r) => r.key === functionKey)?.label ?? functionKey} on this project may withdraw it`,
        );
      }
      await tx.readinessAcknowledgement.delete({ where: key });
      return {
        gateId,
        itemId,
        functionKey,
        withdrawn: { by: existing.acknowledgedByName, at: existing.acknowledgedAt, rationale: existing.rationale },
      };
    });
  }

  // --- Phase 3: registers / evidence ---

  // One endpoint for all ~76 registers: the rows are JSONB, so the shape is the
  // register's own config problem, not the API's. Replace-the-whole-section
  // matches the draft+Save UI (rows can be added and removed together).
  // Per-row blame for a register save (2026-08-27) — positional diff, same
  // row-identity choice `carryRegisterSignatures` already lives with (see
  // the comment at its call site). Only changed rows are returned, to keep
  // the audit payload proportional to the edit, not the whole table.
  private diffRegisterRows(
    committed: RegisterRow[],
    incoming: RegisterRow[],
  ): { rowOrder: number; changeType: 'added' | 'edited' | 'deleted'; before?: RegisterRow; after?: RegisterRow }[] {
    const changes: { rowOrder: number; changeType: 'added' | 'edited' | 'deleted'; before?: RegisterRow; after?: RegisterRow }[] = [];
    const max = Math.max(committed.length, incoming.length);
    for (let i = 0; i < max; i += 1) {
      const before = committed[i];
      const after = incoming[i];
      if (before === undefined && after !== undefined) {
        changes.push({ rowOrder: i, changeType: 'added', after });
      } else if (before !== undefined && after === undefined) {
        changes.push({ rowOrder: i, changeType: 'deleted', before });
      } else if (before !== undefined && after !== undefined && JSON.stringify(before, Object.keys(before).sort()) !== JSON.stringify(after, Object.keys(after).sort())) {
        changes.push({ rowOrder: i, changeType: 'edited', before, after });
      }
    }
    return changes;
  }

  async setRegisterRows(
    user: SessionUser,
    id: string,
    registerKey: string,
    rows: RegisterRow[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    return this.mutate(user, id, expectedVersion, 'register.updated', async (tx, _row, project) => {
      if (isGateRefLocked(project, config.gate)) {
        throw new ForbiddenException(
          `Register "${registerKey}" belongs to gate ${config.gate}, which has passed — it is read-only (use Backtrack)`,
        );
      }
      // A register dedicated to a trigger that does not apply to this project is read-only, whoever asks (project owner,
      // 2026-11-06): its entered columns are what acknowledging the generated "not applicable" clears.
      if (registerLockedAsNotApplicable(project, registerKey)) {
        throw new BadRequestException(
          `"${config.title}" does not apply to this project (no maternal target user), so it is read-only. Acknowledge that it does not apply, or change the target users, instead`,
        );
      }
      // Register closing (2026-08-27) — a SEPARATE, independent lock reason
      // from the gate-based one above: a register can be closed (both
      // Review owner and Co-sign signed) before its own gate has even
      // passed, since closing is now a PRECONDITION for that gate to pass,
      // not a consequence of it having passed. Both checks stay — closing
      // does not replace the gate-based lock, it adds an earlier trigger for
      // the same read-only state.
      // SW-36: what a closing signature locks is exactly the columns settled at the gate it was signed for (and, on a free-form
      // register, the rows). Nothing is frozen automatically by a gate passing — the lock is the consequence of the signatures.
      const committedRegisterRows = project.registers[registerKey] ?? [];
      const lockViolations = registerLockViolations(project, config, committedRegisterRows, rows);
      if (lockViolations.length > 0) {
        throw new ForbiddenException(
          listMessage(
            `Register "${registerKey}":`,
            lockViolations.slice(0, 5),
            lockViolations.length > 5 ? `(and ${lockViolations.length - 5} more)` : undefined,
          ),
        );
      }
      // A `select` cell may only hold one of its own options (2026-08-29). Until
      // this, the dropdown existed only in the browser and the API took any
      // string — so a direct call could store a value nobody could pick, and any
      // readiness rule reading that column would decide a gate on it. Found while
      // verifying Round 4 question 6, whose new `gate4Disposition` is exactly such
      // a rule input. Blank stays legal: it is how an unanswered cell reads.
      // A column required because of another cell of the row (an Approved brief needs its approval date) is checked here
      // too, not only by the table.
      // The register's own row IDs (TR-001, ...) are the server's to assign: an ID is kept only if this register already held it,
      // so a client can neither invent, reuse nor renumber one. Done before the duplicate check below, which then holds by construction.
      rows = assignAutoIds(config, committedRegisterRows, rows);
      // The Ingredient-Level Safety Matrix follows the Formula BOM: its identity and watch-list-match columns are derived here, so a request
      // can neither add an ingredient the BOM lacks nor set a match by hand.
      if (registerKey === SAFETY_MATRIX_KEY) rows = syncSafetyMatrix(project.bom, rows, committedRegisterRows);
      // Columns the workbook computes (a change's overall status, a watch-list row's formula match count) are the server's to set.
      // The match basis a classification was reached on is the server's to record (Round 5 question 4(a)), never the client's.
      rows = snapshotWatchlistBasis(project, registerKey, committedRegisterRows, rows);
      rows = deriveRegisterRows(registerKey, rows, project);
      const missingRequired = missingRequiredProblems(config, rows);
      if (missingRequired.length > 0) {
        throw new BadRequestException(bulletList(missingRequired.slice(0, 5)));
      }
      const duplicates = duplicateValueProblems(config, rows);
      if (duplicates.length > 0) throw new BadRequestException(bulletList(duplicates.slice(0, 5)));
      const outOfScope = marketScopeProblems(config, rows, committedRegisterRows);
      if (outOfScope.length > 0) throw new BadRequestException(bulletList(outOfScope.slice(0, 5)));
      const badSelects = invalidSelectValues(config, rows);
      if (badSelects.length > 0) {
        throw new BadRequestException(
          listMessage(
            `${badSelects.length} cell(s) hold a value that is not an option of their column:`,
            badSelects.map((b) => `row ${b.row + 1} "${b.label}" → "${b.value}"`),
          ),
        );
      }
      // Gate 3 rule (F1 appendix): "A claim may remain under development, but
      // unsupported wording must not be marked as approved" — hard-blocked
      // 2026-07-27 (user-requested). A Published Info row linked to a claim
      // (claimId) cannot be saved in a released workflow state unless that
      // claim is 'Supported' in Claim -> Evidence Traceability. Checked here
      // (not just in the UI) per BACKEND_PLAN's server-is-authoritative rule.
      //
      // Widened 2026-08-12 to the whole of D2 (claim linkage mandatory unless
      // declared non-product; wording equivalence classified by a reviewer),
      // evaluated by the same shared function the UI's save-guard calls.
      // Round 4 question 19(c): inherited claim columns come from the claim, not
      // from the request.
      rows = applyClaimInheritance(config, rows, project.registers['claimEvidenceTraceability'] ?? []);
      // C6: a column flagged `selfAttest` records an act ("confirmed by"), so a
      // new or changed value must be the signed-in person. Rows are matched by
      // their record id where they have one, otherwise by position.
      const attestColumns = config.columns.filter((c) => c.selfAttest);
      if (attestColumns.length > 0) {
        const committedRows = project.registers[registerKey] ?? [];
        rows.forEach((r, i) => {
          const recordId = String(r.recordId ?? '').trim();
          const old = (recordId && committedRows.find((c) => String(c.recordId ?? '').trim() === recordId)) || committedRows[i];
          for (const c of attestColumns) assertSelfAttested(c.label, old?.[c.key], r[c.key], user.displayName);
        });
      }
      // SW-34: the important cells of a register (a status, an assessment, an approval, a signature, who did something) and its
      // rows are the assigned people's alone — the register's Review owner, Co-review and Co-sign on this project, the Lead, an
      // administrator, and the Reviewer named on a row for that row. Plain information stays open to every user of the project.
      {
        const violations = registerAccessViolations(
          project,
          config,
          project.registers[registerKey] ?? [],
          rows,
          { displayName: user.displayName, isAdmin: this.permissions.isAdmin(user) },
        );
        if (violations.length > 0) {
          throw new ForbiddenException(listMessage(`${registerAccessReason(config)} — not allowed here:`, violations.slice(0, 6)));
        }
      }
      // SW-32 and Round 5 question 8: the Reviewer of a finding (and, where both functions are relevant, its second reviewer)
      // must hold the authority the finding needs; every act that clears, closes or conditionally accepts it is done by one
      // of them; where BOTH Safety and Regulatory are relevant both must be obtained; where NEITHER is assigned the row goes to
      // triage and nobody may accept it; and an administrator supplies no scientific acceptance without holding the authority.
      if ((WATCHLIST_REGISTERS as readonly string[]).includes(registerKey)) {
        const committedRows = project.registers[registerKey] ?? [];
        const sameRow = (a: Record<string, unknown>, b: Record<string, unknown>) => String(a.ingredientGroup ?? '').trim() === String(b.ingredientGroup ?? '').trim();
        const authoritiesHeldBy = async (name: string, needs: ('safety' | 'regulatory')[]) => {
          const person = await tx.user.findFirst({
            where: { displayName: name, active: true },
            include: { department: true, roles: { include: { role: true } } },
          });
          if (!person) return [] as ('safety' | 'regulatory')[];
          const held: ('safety' | 'regulatory')[] = [];
          for (const a of needs) if (await this.permissions.canAcceptWatchlistFinding(person, [a])) held.push(a);
          return held;
        };
        const unfit: string[] = [];
        for (const row of newlyNamedReviewerRows(committedRows, rows)) {
          const needs = watchlistRequiredAuthority(row);
          if (needs.length === 0) {
            unfit.push(`${watchlistLabel(row)}: no Safety or Regulatory function is assigned — route it for triage first (set its status to Needs Safety Review or Needs Regulatory Review)`);
            continue;
          }
          const old = committedRows.find((c) => sameRow(c, row)) ?? {};
          const covered = new Set<string>();
          for (const key of ['reviewer', 'secondReviewer'] as const) {
            const name = String(row[key] ?? '').trim();
            if (name === '') continue;
            const held = await authoritiesHeldBy(name, needs);
            held.forEach((a) => covered.add(a));
            if (String(old[key] ?? '').trim() !== name && held.length === 0) {
              unfit.push(`${watchlistLabel(row)}: ${name} (needs ${needs.map((a) => WATCHLIST_AUTHORITY_LABEL[a]).join(' and ')} authority)`);
            }
          }
          const named = ['reviewer', 'secondReviewer'].filter((k) => String(row[k] ?? '').trim() !== '').length;
          if (needs.length > 1 && named > 1 && covered.size < needs.length) {
            unfit.push(`${watchlistLabel(row)}: together the two reviewers must cover ${needs.map((a) => WATCHLIST_AUTHORITY_LABEL[a]).join(' and ')}`);
          }
        }
        if (unfit.length > 0) {
          throw new BadRequestException(listMessage('The reviewers must hold the authority the finding needs:', unfit));
        }
        const notTheirs: string[] = [];
        for (const row of newlyAcceptingActRows(committedRows, rows)) {
          const needs = watchlistRequiredAuthority(row);
          if (needs.length === 0) {
            notTheirs.push(`${watchlistLabel(row)} — no function is assigned, so it must be routed for triage first`);
          } else if (!watchlistNamedReviewers(row).includes(user.displayName)) {
            notTheirs.push(`${watchlistLabel(row)} — only its named reviewer records it`);
          } else if (!(await this.permissions.canAcceptWatchlistFinding(user, needs))) {
            notTheirs.push(`${watchlistLabel(row)} — you do not hold ${needs.map((a) => WATCHLIST_AUTHORITY_LABEL[a]).join(' or ')} authority (an administrator needs it too)`);
          }
        }
        if (notTheirs.length > 0) {
          throw new ForbiddenException(
            listMessage('Clearing, closing or conditionally accepting a finding needs a qualified reviewer named on that row:', notTheirs),
          );
        }
      }
      if (registerKey === 'publishedInfoApproval') {
        const contradictory = contradictoryClaimRows(rows);
        if (contradictory.length > 0) {
          throw new BadRequestException(
            `${contradictory.length} Published Information row(s) are declared as containing no product claim while also linking a Claim ID: ${contradictory
              .map((r) => `${String(r.recordId ?? '(no record id)')} -> ${String(r.claimId)}`)
              .join(', ')}. Unlink the claim, or clear the declaration.`,
          );
        }
        const claimRows = project.registers['claimEvidenceTraceability'] ?? [];
        const bad = publishedInfoViolations(rows, claimRows, project.registers['skuClaimsPifRegister'] ?? []);
        if (bad.length > 0) {
          throw new BadRequestException(
            listMessage(
              `${bad.length} Published Information row(s) cannot sit at a released workflow state:`,
              bad.map((v) => `${String(v.row.recordId ?? '(no record id)')} — ${v.reason}`),
            ),
          );
        }
      }
      // 2026-08-11: one row per vulnerable group, and no group that contradicts
      // the Gate 02 target-user selection outright. The soft half of that rule
      // (groups our mapping only GUESSES at) deliberately stays a UI warning —
      // see vulnerableUsers.ts for why hard-blocking it would enforce our own
      // unconfirmed reading.
      // D4: the three evidence statuses all describe an unapproved row, so none
      // can stand beside the approval tick. The UI sets the pair together, which
      // is exactly why the server still checks it.
      // Round 4 questions 26 and 30(b), 2026-08-29: an APPROVED claim revision is
      // read-only. Refused here rather than only disabled in the browser — the
      // whole point of the rule is that an approved claim cannot be quietly
      // re-worded, and "the UI hides the field" is not that (BACKEND_PLAN §3
      // principle 7). Bumping the revision is the sanctioned route and passes.
      if (registerKey === 'claimEvidenceTraceability') {
        // B21 (2026-10-04): a revision approval names the person who gave it, and
        // only someone with Regulatory or Gate 10 authority can give it.
        const committedClaims = project.registers[registerKey] ?? [];
        const forged = revisionApprovalForgeries(committedClaims, rows, user.displayName);
        if (forged.length > 0) {
          throw new BadRequestException(
            `"Revision approved by" can only record your own approval: ${forged.join(', ')}`,
          );
        }
        if (
          newRevisionApprovals(committedClaims, rows).length > 0 &&
          !(await this.holdsAnyCapability(user, [...REVISION_APPROVAL_CAPABILITIES])) &&
          !canDecideGateInProject(project, 'SG10', { displayName: user.displayName, isAdmin: this.permissions.isAdmin(user) })
        ) {
          throw new ForbiddenException(
            'Approving a claim revision needs Regulatory authority or the right to decide Gate 10',
          );
        }
        const frozen = frozenRevisionEdits(project.registers[registerKey] ?? [], rows);
        if (frozen.length > 0) {
          throw new BadRequestException(
            listMessage(
              `${frozen.length} claim revision(s) are approved and read-only:`,
              frozen.map((f) => `${f.claimId} (${f.changed.join(', ')})`),
              'Record a new revision or a new Claim ID instead — the reviewer decides which.',
            ),
          );
        }
        // Round 5 question 6(c): further use of withdrawn wording is suspended — no claim can be newly linked to it.
        const toWithdrawn = newLinksToWithdrawnWording(project.registers[registerKey] ?? [], rows, project.reference.claimsLibrary);
        if (toWithdrawn.length > 0) {
          throw new BadRequestException(
            listMessage('These claims were linked to wording the Claims Library has withdrawn:', toWithdrawn, 'Withdrawn wording is no longer used; pick current wording instead.'),
          );
        }
      }
      if (registerKey === RM_EVIDENCE_REGISTER) {
        const bad = rmEvidenceContradictions(rows);
        if (bad.length > 0) {
          throw new BadRequestException(
            `${bad.length} Supplier & RM Evidence row(s) are marked approved for use while still carrying an evidence review status: ${bad
              .map((r) => `${String(r.rmCode ?? '(no RM code)')} -> ${String(r.evidenceStatus)}`)
              .join(', ')}. Clear the status, or un-approve the row.`,
          );
        }
      }
      // D3: "A genuine controlled Next Action must be used. A note alone is not
      // sufficient." A reference that resolves to nothing is the same thing as a
      // note — it looks like a controlled action and is not one.
      // Both watch-lists since Round 4 question 32(e) (2026-08-24) — the caution
      // list now carries the same reviewer-trail columns, so it needs the same
      // guard. Scoping this to one register while the other has an identical
      // `linkedNextActionId` column would leave half the rule enforced.
      if (WATCHLIST_REGISTERS.includes(registerKey)) {
        const broken = brokenNextActionLinks(project, rows);
        if (broken.length > 0) {
          throw new BadRequestException(
            `${broken.length} watch-list row(s) link a Next Action that does not exist: ${broken
              .map((r) => `${watchlistLabel(r)} -> ${String(r.linkedNextActionId)}`)
              .join(', ')}. Raise the action first, then link it.`,
          );
        }
      }
      // A superseded safety finding and the finding that replaced it are both kept (Round 5 question 3(b)).
      if (registerKey === SAFETY_FINDINGS_REGISTER) {
        const dropped = droppedSupersessionRecords(project.registers[registerKey] ?? [], rows);
        if (dropped.length > 0) {
          throw new BadRequestException(
            `Critical Safety Findings: ${dropped.join(', ')} cannot be removed — a superseded finding and its replacement are both kept`,
          );
        }
      }
      if (registerKey === VULNERABLE_REGISTER) {
        const blockers = vulnerableSaveBlockers(project, rows);
        if (blockers.length > 0) {
          throw new BadRequestException(listMessage('Vulnerable-User Assessment:', blockers));
        }
      }
      // C1's "varies from previously approved wording": snapshot the wording each
      // time a review DATE is recorded or changed, so a later edit to the wording
      // stops matching and the claim needs reviewing again. Derived server-side
      // rather than typed — a snapshot someone can edit proves nothing.
      // A signature is written by the sign/withdraw endpoints and by nothing
      // else. The bulk save is a plain table write, so whatever it says about a
      // signature field is discarded and the committed value carried over —
      // otherwise a client could forge one, or quietly erase one, by editing the
      // row it sits on. Same reasoning as `syncPublishedInfoDerived` below: a
      // value that PROVES something has to be derived by the server, never sent.
      const rowsAfterSignatureGuard =
        signatureColumns(config).length > 0
          ? this.carryRegisterSignatures(config, project.registers[registerKey] ?? [], rows)
          : rows;
      if (registerKey === 'formulationChangeRegister') {
        await this.assertNpDecisionAllowed(user, project.registers[registerKey] ?? [], rowsAfterSignatureGuard);
      }
      const rowsToWrite =
        registerKey === 'claimEvidenceTraceability'
          ? snapshotReviewedWording(project, rowsAfterSignatureGuard)
          : registerKey === 'publishedInfoApproval'
            // displayName, not the user id — every `user`-typed register column
            // stores a display name (see UserSelect), so the exemption declarer
            // renders like every other person field.
            ? syncPublishedInfoDerived(
                project,
                rowsAfterSignatureGuard,
                user.displayName,
                await this.holdsAnyCapability(user, [CLAIM_EXEMPTION_CAPABILITY]),
              )
            : rowsAfterSignatureGuard;
      // Blame (2026-08-27): editing itself stays open to anyone (rule A4 is
      // not touched), but every save now leaves a real per-row trail instead
      // of the previous `{ registerKey, rows: rows.length }` summary, which
      // could not say WHICH row changed or what it said before. Diffed by
      // POSITION, the same way carryRegisterSignatures already treats row
      // identity for this register — there is no stable per-row id to diff
      // by instead (setRegisterRows always deletes and rewrites the whole
      // array; rowOrder IS the array index). Known limitation, inherited
      // from that same positional-identity choice, not new here: a row moved
      // to a different position reads as one delete + one add, not a move.
      // Rows written while the SW-4 row stamps existed carry two server-owned keys that nothing reads any
      // more; they are dropped here so the data cleans itself on the next save.
      const stampedRows = rowsToWrite.map((row) => {
        const { __rowId: _id, __bornAtGate: _born, ...rest } = row as Record<string, unknown>;
        return rest as RegisterRow;
      });
      const rowDiff = this.diffRegisterRows(project.registers[registerKey] ?? [], stampedRows);
      await tx.registerRow.deleteMany({ where: { projectId: id, registerKey } });
      if (stampedRows.length > 0) {
        await tx.registerRow.createMany({
          data: stampedRows.map((data, rowOrder) => ({
            projectId: id,
            registerKey,
            rowOrder,
            data: data as Prisma.InputJsonValue,
            updatedById: user.id,
          })),
        });
      }
      return { registerKey, rows: stampedRows.length, changes: rowDiff };
    });
  }

  // -------------------------------------------------- register signatures ----
  //
  // A `signature` column replaces the workbook's "type your name here" approval
  // cell. It is not a field the table can write: the managed keys are set here,
  // from the session, or cleared by withdraw, and by nothing else.
  //
  // Row addressing is the row INDEX, which is what this register already runs
  // on — setRegisterRows deletes every row and rewrites them in array order, so
  // rowOrder IS the index. That makes deleting a signed row the one way an index
  // could shift under a signature, so the carry-over below refuses it.

  private registerSignatureColumn(config: RegisterConfig, column: string) {
    const col = signatureColumns(config).find((c) => c.key === column);
    if (!col) {
      throw new BadRequestException(`"${column}" is not a signature column on register "${config.key}"`);
    }
    if (!col.signCapability?.includes('|')) {
      // A signature column anyone may sign is the free-text box it replaced.
      throw new BadRequestException(`Signature column "${column}" declares no signing capability`);
    }
    const [resource, action] = col.signCapability.split('|');
    return { col, resource, action };
  }

  // The Final Approver's decision on a formulation change (Rejected, Pending, On hold) is theirs to record: a row whose
  // decision changes, or a new row that starts on anything but Pending, needs the commercial-approval capability.
  // 'Approved' never goes through here — only the signature sets it.
  private async assertNpDecisionAllowed(user: SessionUser, committed: RegisterRow[], rows: RegisterRow[]): Promise<void> {
    const changed = rows.some((row, index) => {
      const was = committed[index]?.approvedByNp ?? NP_APPROVAL_PENDING;
      const now = row.approvedByNp ?? NP_APPROVAL_PENDING;
      return now !== was && now !== NP_APPROVAL_APPROVED && was !== NP_APPROVAL_APPROVED;
    });
    if (changed && !(await this.holdsAnyCapability(user, ['formulation-change|approve-commercial']))) {
      throw new ForbiddenException(
        `Only the Final Approver records Rejected, On hold or Pending on a formulation change (needs formulation-change|approve-commercial). Allowed values: ${NP_APPROVAL_OPTIONS.join(', ')}`,
      );
    }
  }

  // Carry every signature field over from the committed rows, by index, and
  // refuse a save that would drop a signed row. Withdrawing is how a signature
  // goes away; a table save must never be able to do it as a side effect.
  private carryRegisterSignatures(
    config: RegisterConfig,
    committed: RegisterRow[],
    incoming: RegisterRow[],
  ): RegisterRow[] {
    const cols = signatureColumns(config);
    const out = incoming.map((row) => ({ ...row }));
    committed.forEach((prev, index) => {
      for (const col of cols) {
        const keys = signatureFieldKeys(col.key);
        if (prev[keys.userId] && index >= out.length) {
          throw new BadRequestException(
            `Row ${index + 1} carries a signature (${col.label}) and cannot be deleted — withdraw the signature first`,
          );
        }
        if (index >= out.length) continue;
        // A signature that still counts locks the row it vouches for: whoever signed attested to THESE cells
        // (project owner, 2026-10-11). Changing one means withdrawing the signature first. A stale signature
        // (the row was already out of step with it, e.g. an out-of-band edit) does not lock anything.
        if (prev[keys.userId] && !prev[keys.stale]) {
          const was = registerRowCells(config.key, prev, col.key);
          const now = registerRowCells(config.key, out[index], col.key);
          if (JSON.stringify(was) !== JSON.stringify(now)) {
            throw new ForbiddenException(
              `Row ${index + 1} carries a signature (${col.label}), so what it signed is locked — withdraw the signature (with a reason) to change it`,
            );
          }
        }
        for (const key of Object.values(keys)) {
          if (prev[key] === undefined) delete out[index][key];
          else out[index][key] = prev[key];
        }
      }
    });
    // Rows added in this save start unsigned, whatever the client sent.
    for (let index = committed.length; index < out.length; index += 1) {
      for (const col of cols) {
        for (const key of Object.values(signatureFieldKeys(col.key))) delete out[index][key];
      }
    }
    // `stale` is computed on read (project-mapper) and must never be written: the committed rows handed in
    // here come from that read, so without this it would be persisted as if it were a fact about the row.
    for (const row of out) for (const col of cols) delete row[signatureFieldKeys(col.key).stale];
    // The derived "approved?" tick that pairs with the signature. Held as its
    // own column so the table can show it, but it states the same fact the
    // signature does, so the signature decides it — for as long as it still counts. A signature whose
    // row has since changed is stale (the hash it was signed with no longer matches), and a signature
    // recorded before hashes existed has none to compare, which reads as "still counts".
    //
    // The column is the workbook's four-value decision list. 'Approved' is the signature's alone: it is set here when a
    // signature stands and can never be typed. The other three (Rejected, Pending, On hold) are the Final Approver's own
    // decision and are kept as sent — whether the sender may send them is checked by `assertNpDecisionAllowed`.
    if (cols.some((c) => c.key === 'npSignOff')) {
      const keys = signatureFieldKeys('npSignOff');
      out.forEach((row, index) => {
        const stored = row[keys.hash];
        const current = typeof stored === 'string' && stored !== '' ? rowHashFromCells(config.key, index, 'npSignOff', row) : undefined;
        const standing = !!row[keys.userId] && (current === undefined || current === stored);
        if (standing) {
          row.approvedByNp = NP_APPROVAL_APPROVED;
        } else if (row.approvedByNp === NP_APPROVAL_APPROVED || !NP_APPROVAL_OPTIONS.includes(row.approvedByNp as never)) {
          // Nothing proves an approval, so it cannot read as one; blank and unknown values read as pending.
          row.approvedByNp = NP_APPROVAL_PENDING;
        }
        // The date follows the signature, never what the client sent.
        const prev = committed[index];
        if (standing && prev?.npApprovalDate && prev.approvedByNp === NP_APPROVAL_APPROVED) row.npApprovalDate = prev.npApprovalDate;
        else if (!standing) delete row.npApprovalDate;
      });
    }
    return out;
  }

  // Bound to the content hash, so a code entered for one version of the row cannot sign another.
  private registerSignatureStepUpPurpose(
    id: string,
    registerKey: string,
    rowIndex: number,
    column: string,
    contentHash: string,
  ): string {
    return `register_signature:${id}:${registerKey}:${rowIndex}:${column}:${contentHash}`;
  }

  private registerRowContentHash(project: ProjectData, registerKey: string, rowIndex: number, column: string): string {
    const hash = registerRowContentHashOf(project, registerKey, rowIndex, column);
    if (!hash) throw new NotFoundException(`Row ${rowIndex + 1} not found on register "${registerKey}"`);
    return hash;
  }

  // What the signer reads before signing: the row as it is now and the hash the signature is bound to.
  // Read-only — nothing is written, and any signed-in user may read project data.
  async previewRegisterRowSignature(
    id: string,
    registerKey: string,
    rowIndex: number,
    column: string,
  ): Promise<RegisterRowSignPreview> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const { col } = this.registerSignatureColumn(config, column);
    const project = toProjectData(await this.loadOrThrow(this.prisma, id), [], await this.loadReference(this.prisma));
    const content = registerRowSignContent(project, registerKey, rowIndex, column);
    if (!content) throw new NotFoundException(`Row ${rowIndex + 1} not found on register "${registerKey}"`);
    return {
      registerKey,
      title: config.title,
      rowIndex,
      column,
      columnLabel: col.label,
      hash: this.registerRowContentHash(project, registerKey, rowIndex, column),
      previewedAt: new Date().toISOString(),
      columns: content.columns,
      row: content.row,
    };
  }

  // One step, not two — same shape as the phase sign-off step-up: a code read
  // off the signer's authenticator is exchanged for a short-lived, single-use
  // proof bound to this exact row and column.
  async verifyRegisterSignatureStepUp(
    user: SessionUser,
    id: string,
    registerKey: string,
    rowIndex: number,
    column: string,
    code: string,
    expectedHash: string | undefined,
  ): Promise<{ stepUpToken: string }> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const { col, resource, action } = this.registerSignatureColumn(config, column);
    if (!expectedHash) throw new BadRequestException('expectedHash is required — open the signing preview first');
    if (!(await this.permissions.hasPermission(user, resource, action))) {
      throw new ForbiddenException(`Your role may not sign "${col.label}" (needs ${col.signCapability})`);
    }
    const signature = await this.prisma.userSignature.findUnique({ where: { userId: user.id } });
    if (!signature) {
      throw new BadRequestException('Save a signature in My Account before signing');
    }
    // Refused BEFORE the code is spent: a stale preview must not burn the signer's one-time code.
    const current = toProjectData(await this.loadOrThrow(this.prisma, id), [], await this.loadReference(this.prisma));
    if (this.registerRowContentHash(current, registerKey, rowIndex, column) !== expectedHash) {
      throw this.registerContentChanged();
    }
    await this.totp.verifyForStepUp(user.id, code);
    const purpose = this.registerSignatureStepUpPurpose(id, registerKey, rowIndex, column, expectedHash);
    const proof = await this.prisma.stepUpProof.create({
      data: { userId: user.id, purpose, channel: 'totp' },
    });
    const stepUpToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'register_signature_step_up', proof: proof.id, purpose },
      { expiresIn: '5m' },
    );
    return { stepUpToken };
  }

  async signRegisterRow(
    user: SessionUser,
    id: string,
    registerKey: string,
    rowIndex: number,
    column: string,
    stepUpToken: string,
    expectedHash: string | undefined,
  ): Promise<ProjectEnvelope> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const { col, resource, action } = this.registerSignatureColumn(config, column);
    if (!expectedHash) throw new BadRequestException('expectedHash is required — open the signing preview first');
    // Guarded by the content hash instead of the project-wide version (as gate signing is), so other
    // people can keep working while the signer reads. The row lock still serialises the write.
    return this.mutate(user, id, null, 'register_signature.signed', async (tx, row, project) => {
      // The signer signs what they were SHOWN, compared inside the row-locked transaction.
      if (this.registerRowContentHash(project, registerKey, rowIndex, column) !== expectedHash) {
        throw this.registerContentChanged();
      }
      if (isGateRefLocked(project, config.gate)) {
        throw new ForbiddenException(
          `Register "${registerKey}" belongs to gate ${config.gate}, which has passed — it is read-only (use Backtrack)`,
        );
      }
      if (!(await this.permissions.hasPermission(user, resource, action))) {
        throw new ForbiddenException(`Your role may not sign "${col.label}" (needs ${col.signCapability})`);
      }
      const target = await tx.registerRow.findFirst({
        where: { projectId: id, registerKey, rowOrder: rowIndex },
      });
      if (!target) throw new NotFoundException(`Row ${rowIndex + 1} not found on register "${registerKey}"`);
      const data = { ...(target.data as RegisterRow) };
      const keys = signatureFieldKeys(column);
      // A signature whose row changed afterwards is stale: it no longer counts, and signing again
      // replaces it. Withdrawing first stays possible but is no longer required.
      const rowIsStale = !!project.registers[registerKey]?.[rowIndex]?.[keys.stale];
      if (data[keys.userId] && !rowIsStale) {
        throw new BadRequestException(
          `"${col.label}" was already signed by ${String(data[keys.name] ?? 'another user')} — withdraw it first`,
        );
      }

      // The same second factor the phase block requires. Signing IS the act, so
      // the proof is spent inside this row-locked transaction, which is what
      // makes a stateless 5-minute JWT single-use.
      if (!stepUpToken) {
        throw new BadRequestException(
          'An authenticator code is required to sign — enter the code from your authenticator app',
        );
      }
      let payload: { sub?: string; typ?: string; proof?: string; purpose?: string };
      try {
        payload = await this.jwt.verifyAsync(stepUpToken);
      } catch {
        throw new BadRequestException('Verification expired or invalid — enter a new code');
      }
      const expectedPurpose = this.registerSignatureStepUpPurpose(id, registerKey, rowIndex, column, expectedHash);
      if (
        payload.typ !== 'register_signature_step_up' ||
        payload.sub !== user.id ||
        payload.purpose !== expectedPurpose
      ) {
        throw new BadRequestException('Verification does not match this signature');
      }
      const proof = payload.proof ? await tx.stepUpProof.findUnique({ where: { id: payload.proof } }) : null;
      if (!proof || proof.userId !== user.id || proof.usedForId) {
        throw new BadRequestException('Verification already used or invalid — enter a new code');
      }
      const saved = await tx.userSignature.findUnique({ where: { userId: user.id } });
      if (!saved) throw new BadRequestException('Save a signature in My Account before signing');
      await tx.stepUpProof.update({ where: { id: proof.id }, data: { usedForId: expectedPurpose } });

      const now = new Date();
      data[keys.name] = user.displayName;
      data[keys.userId] = user.id;
      // Snapshotted, never re-read — a role change tomorrow must not rewrite
      // what this signature claimed today.
      data[keys.role] = user.roles.map((r) => r.role.name).join(', ') || '';
      data[keys.at] = now.toISOString();
      data[keys.image] = saved.imageData;
      // What the signer was shown. A later edit makes the signature stale by no longer matching it.
      data[keys.hash] = expectedHash;
      delete data[keys.stale];
      if (column === 'npSignOff') {
        data.approvedByNp = NP_APPROVAL_APPROVED;
        data.npApprovalDate = now.toISOString().slice(0, 10);
      }
      await tx.registerRow.update({
        where: { id: target.id },
        data: { data: data as Prisma.InputJsonValue, updatedById: user.id },
      });
      return { registerKey, rowIndex, column, recordVersion: row.version };
    });
  }

  // Only the signer may release their own signature (an admin too, for the case
  // where that account is gone), and a reason is mandatory — B4, no silent
  // corrections. Same rule as withdrawSignOff, for the same reason.
  async withdrawRegisterRowSignature(
    user: SessionUser,
    id: string,
    registerKey: string,
    rowIndex: number,
    column: string,
    reason: string,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const why = reason?.trim();
    if (!why) throw new BadRequestException('A reason is required to withdraw a signature');
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const { col } = this.registerSignatureColumn(config, column);
    return this.mutate(user, id, expectedVersion, 'register_signature.withdrawn', async (tx) => {
      const target = await tx.registerRow.findFirst({
        where: { projectId: id, registerKey, rowOrder: rowIndex },
      });
      if (!target) throw new NotFoundException(`Row ${rowIndex + 1} not found on register "${registerKey}"`);
      const data = { ...(target.data as RegisterRow) };
      const keys = signatureFieldKeys(column);
      if (!data[keys.userId]) throw new BadRequestException(`"${col.label}" is not signed`);
      if (data[keys.userId] !== user.id && !this.permissions.isAdmin(user)) {
        throw new ForbiddenException(`Only ${String(data[keys.name] ?? 'the signer')} may withdraw this signature`);
      }
      for (const key of Object.values(keys)) delete data[key];
      if (column === 'npSignOff') {
        data.approvedByNp = NP_APPROVAL_PENDING;
        delete data.npApprovalDate;
      }
      await tx.registerRow.update({
        where: { id: target.id },
        data: { data: data as Prisma.InputJsonValue, updatedById: user.id },
      });
      return { registerKey, rowIndex, column, reason: why };
    });
  }

  // -------------------------------------------------- register closing ----
  //
  // A register stays open to anyone to add/edit/delete (rule A4, untouched)
  // — but a deliberate two-signature act (Review owner + Co-sign) can CLOSE
  // it, an independent read-only trigger from isGateRefLocked (2026-08-27,
  // user-requested; see the guard in setRegisterRows and
  // unclosedRegistersBlocking in gateProgress.ts, which requires closure
  // before the gate that depends on it may pass). Unlike phase sign-off,
  // there is no separate nomination step: the signer for each role is
  // derived directly from the register's own ReviewOwnerSpec — the same
  // resolution the on-screen "Review owner · Co-sign" caption already uses
  // — so whoever project_reviewers already names for that role is who may
  // sign, nothing to assign first.

  // A closure is for one gate (SW-36): the gate must be one this register is actually closed at.
  private assertClosureGate(config: RegisterConfig, gateId: string | undefined): string {
    if (!gateId || !registerClosureGateIds(config).includes(gateId)) {
      throw new BadRequestException(
        `Register "${config.key}" is closed at ${registerClosureGateIds(config).join(', ') || 'no gate'} — "${gateId ?? ''}" is not one of them`,
      );
    }
    return gateId;
  }

  private registerClosureRoleKey(config: RegisterConfig, role: 'Review owner' | 'Co-sign'): string {
    const spec = registerReviewSpec(config);
    if (!spec) {
      throw new BadRequestException(
        `Register "${config.key}" has no review owner configured — it cannot be closed`,
      );
    }
    // Shared with the frontend closing panel (packages/shared/src/config/reviewers.ts)
    // — never re-derive this independently.
    return registerClosureSignerRole(spec, role);
  }

  // Who may sign a role. A register that names its own roles (the workbook's sign-off block) is signed by the person the project's Lead
  // NOMINATED for that role — never by anyone else, whatever their rights; any other register by the person its review-owner spec
  // resolves to. The role must be one the register actually asks for.
  private async assertClosureSigner(
    db: Prisma.TransactionClient | PrismaService,
    user: SessionUser,
    projectId: string,
    config: RegisterConfig,
    gateId: string,
    role: string,
  ): Promise<void> {
    if (!registerClosureRoles(config).includes(role)) {
      throw new BadRequestException(`"${role}" is not a signing role of "${config.key}" (it asks for: ${registerClosureRoles(config).join(', ')})`);
    }
    if (closureSignersAreNominated(config)) {
      const closure = await db.registerClosure.findUnique({
        where: { projectId_registerKey_gateId: { projectId, registerKey: config.key, gateId } },
        include: { signOffs: true },
      });
      const row = closure?.signOffs.find((r) => r.role === role);
      if (!row?.assignedToUserId) {
        throw new ForbiddenException(`"${role}" has not been nominated yet — the project's Lead nominates who signs it`);
      }
      if (row.assignedToUserId !== user.id) {
        throw new ForbiddenException(`"${role}" is nominated to somebody else — only that person may sign`);
      }
      return;
    }
    const roleKey = this.registerClosureRoleKey(config, role as 'Review owner' | 'Co-sign');
    const reviewer = await db.projectReviewer.findUnique({ where: { projectId_roleKey: { projectId, roleKey } } });
    if (!reviewer || reviewer.name.trim() !== user.displayName.trim()) {
      throw new ForbiddenException(
        `"${role}" for "${config.key}" is ${reviewer ? `assigned to ${reviewer.name}` : 'not assigned to anyone'} — only that person may sign`,
      );
    }
  }

  // The project's Lead nominates who signs each role of a register page that carries the workbook's own sign-off block. A signed
  // role keeps its signer (reassigning it would leave a signature next to somebody else's name, B4), and a register that does not
  // name its own roles has nobody to nominate.
  async assignRegisterClosureSigner(
    user: SessionUser,
    id: string,
    registerKey: string,
    gateIdIn: string | undefined,
    assignments: { role: string; userId?: string | null }[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    if (!closureSignersAreNominated(config)) {
      throw new BadRequestException(`"${registerKey}" is signed by its review owner and co-signer — there is nobody to nominate`);
    }
    const gateId = this.assertClosureGate(config, gateIdIn);
    return this.mutate(user, id, expectedVersion, 'register_close.signer_assigned', async (tx, _row, project) => {
      this.assertIsProjectLead(user, project, 'nominate who signs a register');
      const closure = await this.ensureRegisterClosure(tx, id, registerKey, gateId, config);
      const rows = await tx.registerClosureSignOff.findMany({ where: { closureId: closure.id } });
      let changed = 0;
      for (const assignment of assignments) {
        const existing = rows.find((r) => r.role === assignment.role);
        if (!existing) {
          throw new BadRequestException(`"${assignment.role}" is not a signing role of "${registerKey}"`);
        }
        const next = assignment.userId ?? null;
        if (existing.assignedToUserId === next) continue;
        if (existing.signedAt) {
          throw new BadRequestException(`"${assignment.role}" is already signed — withdraw the signature before reassigning it`);
        }
        if (next) {
          const target = await tx.user.findUnique({ where: { id: next }, select: { active: true } });
          if (!target?.active) {
            throw new BadRequestException(`Cannot nominate "${assignment.role}" to an unknown or deactivated user`);
          }
        }
        await tx.registerClosureSignOff.update({ where: { id: existing.id }, data: { assignedToUserId: next } });
        changed += 1;
      }
      return { registerKey, gateId, changed };
    });
  }

  // Older projects (created before this feature) never had these rows
  // scaffolded — rather than depend on scaffold timing, find-or-create them
  // here too, the same "additive backfill" pattern seedDemoProject already
  // uses for project_reviewers.
  private async ensureRegisterClosure(
    tx: Prisma.TransactionClient,
    projectId: string,
    registerKey: string,
    gateId: string,
    config: RegisterConfig,
  ) {
    const closure = await tx.registerClosure.upsert({
      where: { projectId_registerKey_gateId: { projectId, registerKey, gateId } },
      update: {},
      create: { projectId, registerKey, gateId },
    });
    for (const role of registerClosureRoles(config)) {
      await tx.registerClosureSignOff.upsert({
        where: { closureId_role: { closureId: closure.id, role } },
        update: {},
        create: { closureId: closure.id, role },
      });
    }
    return closure;
  }

  // The proof is bound to the content hash, so a code entered for one version of the register cannot
  // sign another — the same rule gate signatures follow (see gateStepUpPurpose).
  private registerCloseStepUpPurpose(id: string, registerKey: string, gateId: string, role: string, contentHash: string): string {
    return `register_close:${id}:${registerKey}:${gateId}:${role}:${contentHash}`;
  }

  private registerContentHash(project: ProjectData, registerKey: string, gateId: string): string {
    const hash = registerContentHashOf(project, registerKey, gateId);
    if (!hash) throw new BadRequestException(`Unknown register "${registerKey}"`);
    return hash;
  }

  // What the closer reads before signing: the register's rows as they are now and the hash their
  // signature will be bound to. Read-only — nothing is written, and any signed-in user may read project data.
  async previewRegisterClose(id: string, registerKey: string, gateIdIn: string | undefined): Promise<RegisterClosePreview> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const gateId = this.assertClosureGate(config, gateIdIn);
    const row = await this.loadOrThrow(this.prisma, id);
    const project = toProjectData(row, [], await this.loadReference(this.prisma));
    const content = registerClosureContent(project, registerKey, gateId);
    if (!content) throw new BadRequestException(`Unknown register "${registerKey}"`);
    return {
      registerKey,
      gateId,
      title: config.closureTitle ?? config.title,
      hash: this.registerContentHash(project, registerKey, gateId),
      previewedAt: new Date().toISOString(),
      columns: content.columns,
      rows: content.rows,
      ...(content.sections ? { sections: content.sections, tableTitle: config.title } : {}),
    };
  }

  private registerContentChanged(): UnprocessableEntityException {
    return new UnprocessableEntityException({
      code: 'REGISTER_CONTENT_CHANGED',
      message: 'This register changed after you opened the signing preview — review it again before signing.',
    });
  }

  async verifyRegisterCloseStepUp(
    user: SessionUser,
    id: string,
    registerKey: string,
    gateIdIn: string | undefined,
    role: RegisterClosureSignOff['role'],
    code: string,
    expectedHash: string | undefined,
  ): Promise<{ stepUpToken: string }> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const gateId = this.assertClosureGate(config, gateIdIn);
    if (!expectedHash) throw new BadRequestException('expectedHash is required — open the signing preview first');
    await this.assertClosureSigner(this.prisma, user, id, config, gateId, role);
    const signature = await this.prisma.userSignature.findUnique({ where: { userId: user.id } });
    if (!signature) {
      throw new BadRequestException('Save a signature in My Account before signing');
    }
    // Refused BEFORE the code is spent: a stale preview must not burn the signer's one-time code.
    const current = toProjectData(await this.loadOrThrow(this.prisma, id), [], await this.loadReference(this.prisma));
    if (this.registerContentHash(current, registerKey, gateId) !== expectedHash) throw this.registerContentChanged();
    await this.totp.verifyForStepUp(user.id, code);
    const purpose = this.registerCloseStepUpPurpose(id, registerKey, gateId, role, expectedHash);
    const proof = await this.prisma.stepUpProof.create({
      data: { userId: user.id, purpose, channel: 'totp' },
    });
    const stepUpToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'register_close_step_up', proof: proof.id, purpose },
      { expiresIn: '5m' },
    );
    return { stepUpToken };
  }

  async signRegisterClose(
    user: SessionUser,
    id: string,
    registerKey: string,
    gateIdIn: string | undefined,
    role: RegisterClosureSignOff['role'],
    stepUpToken: string,
    expectedHash: string | undefined,
  ): Promise<ProjectEnvelope> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const gateId = this.assertClosureGate(config, gateIdIn);
    if (!expectedHash) throw new BadRequestException('expectedHash is required — open the signing preview first');
    // Guarded by the content hash instead of the project-wide version (as gate signing is), so other
    // people can keep working on the project while the closer reads. The row lock still serialises the write.
    return this.mutate(user, id, null, 'register_close.signed', async (tx, row, project) => {
      // The closer signs what they were SHOWN. Compared here, inside the row-locked transaction, so the
      // content cannot change between this check and the write.
      if (this.registerContentHash(project, registerKey, gateId) !== expectedHash) throw this.registerContentChanged();
      await this.assertClosureSigner(tx, user, id, config, gateId, role);
      const closure = await this.ensureRegisterClosure(tx, id, registerKey, gateId, config);
      const existing = await tx.registerClosureSignOff.findUnique({
        where: { closureId_role: { closureId: closure.id, role } },
      });
      // A signature whose register changed afterwards is stale: it no longer counts, and signing again
      // replaces it. Withdrawing first stays possible but is no longer required.
      const alreadyStale = !!project.registerClosures[closureKey(registerKey, gateId)]?.signOffs.find((x) => x.role === role)?.stale;
      if (existing?.signedAt && !alreadyStale) {
        throw new BadRequestException(`"${role}" was already signed by ${existing.name ?? 'another user'} — withdraw it first`);
      }
      if (!stepUpToken) {
        throw new BadRequestException(
          'An authenticator code is required to sign — enter the code from your authenticator app',
        );
      }
      let payload: { sub?: string; typ?: string; proof?: string; purpose?: string };
      try {
        payload = await this.jwt.verifyAsync(stepUpToken);
      } catch {
        throw new BadRequestException('Verification expired or invalid — enter a new code');
      }
      const expectedPurpose = this.registerCloseStepUpPurpose(id, registerKey, gateId, role, expectedHash);
      if (payload.typ !== 'register_close_step_up' || payload.sub !== user.id || payload.purpose !== expectedPurpose) {
        throw new BadRequestException('Verification does not match this signature');
      }
      const proof = payload.proof ? await tx.stepUpProof.findUnique({ where: { id: payload.proof } }) : null;
      if (!proof || proof.userId !== user.id || proof.usedForId) {
        throw new BadRequestException('Verification already used or invalid — enter a new code');
      }
      const saved = await tx.userSignature.findUnique({ where: { userId: user.id } });
      if (!saved) throw new BadRequestException('Save a signature in My Account before signing');
      // Marker is the RegisterClosureSignOff row's own id, following
      // signSignOff's convention (a real row id) rather than the
      // purpose-string convention signRegisterRow used — that row is exactly
      // "what this proof was spent on".
      const target = existing ?? (await tx.registerClosureSignOff.findUniqueOrThrow({
        where: { closureId_role: { closureId: closure.id, role } },
      }));
      await tx.stepUpProof.update({ where: { id: proof.id }, data: { usedForId: target.id } });

      const now = new Date();
      await tx.registerClosureSignOff.update({
        where: { id: target.id },
        data: {
          name: user.displayName,
          signedByUserId: user.id,
          signedAt: now,
          roleAtSigning: user.roles.map((r) => r.role.name).join(', ') || null,
          recordVersion: row.version,
          signatureImage: saved.imageData,
          signatureVerifiedAt: now,
          // What the closer was shown. A later edit makes the signature stale by no longer matching it.
          contentHash: expectedHash,
        },
      });
      return { registerKey, gateId, role, recordVersion: row.version };
    });
  }

  // Only the signer may withdraw their own signature (an admin too, for the
  // case where that account is gone), and a reason is mandatory — B4, no
  // silent corrections. Same rule as withdrawSignOff/withdrawRegisterRowSignature.
  async withdrawRegisterClose(
    user: SessionUser,
    id: string,
    registerKey: string,
    gateIdIn: string | undefined,
    role: RegisterClosureSignOff['role'],
    reason: string,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const why = reason?.trim();
    if (!why) throw new BadRequestException('A reason is required to withdraw a signature');
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const gateId = this.assertClosureGate(config, gateIdIn);
    return this.mutate(user, id, expectedVersion, 'register_close.withdrawn', async (tx, _row, project) => {
      // Like a gate signature, a closure given for a gate that has PASSED cannot be withdrawn: only Backtrack reopens it.
      if (isGatePassed(project, gateId)) {
        throw new ForbiddenException(`${gateId} has passed, so its closing signatures stand — use Backtrack to reopen it`);
      }
      const closure = await tx.registerClosure.findUnique({ where: { projectId_registerKey_gateId: { projectId: id, registerKey, gateId } } });
      const existing = closure
        ? await tx.registerClosureSignOff.findUnique({ where: { closureId_role: { closureId: closure.id, role } } })
        : null;
      if (!existing?.signedAt) throw new BadRequestException(`"${role}" is not signed`);
      if (existing.signedByUserId !== user.id && !this.permissions.isAdmin(user)) {
        throw new ForbiddenException(`Only ${existing.name ?? 'the signer'} may withdraw this signature`);
      }
      await tx.registerClosureSignOff.update({
        where: { id: existing.id },
        data: {
          name: null,
          signedByUserId: null,
          signedAt: null,
          roleAtSigning: null,
          recordVersion: null,
          signatureImage: null,
          signatureVerifiedAt: null,
          contentHash: null,
        },
      });
      return { registerKey, gateId, role, reason: why };
    });
  }

  async setEvidenceItems(
    user: SessionUser,
    id: string,
    items: ProjectData['evidence'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'evidence.updated', async (tx, row, project) => {
      // Fixed rows seeded from EVIDENCE_AREAS — matched by `area`, never replaced
      // wholesale, so the seeded reference text cannot be overwritten by a client.
      for (const item of items) {
        const target = row.evidenceItems.find((e) => e.area === item.area);
        if (!target) continue;
        // C9 (SME rule audit, 2026-10-04): the B4 edit lock, which every other
        // evidence surface already has. A changed row whose gate has passed is
        // refused; an unchanged one rides along with the rest of the save.
        const gateRef = EVIDENCE_AREAS.find((a) => a.area === item.area)?.gate;
        assertOneOf(`Evidence area "${item.area}" status`, item.status, SHEET_STATUSES);
        assertOneOf(`Evidence area "${item.area}" required`, item.required, EVIDENCE_REQUIRED_OPTIONS);
        const changed =
          item.status !== target.status ||
          item.required !== target.required ||
          (item.evidenceLink ?? null) !== (target.evidenceLink ?? null) ||
          (item.notes ?? null) !== (target.notes ?? null);
        if (changed && isGateRefLocked(project, gateRef)) {
          throw new ForbiddenException(
            `Evidence area "${item.area}" belongs to gate ${gateRef}, which has passed — it is read-only (use Backtrack)`,
          );
        }
        await tx.evidenceItem.update({
          where: { id: target.id },
          data: {
            status: item.status,
            required: item.required,
            evidenceLink: item.evidenceLink ?? null,
            notes: item.notes ?? null,
          },
        });
      }
      return { items: items.length };
    });
  }

  // --- Phase 4: BOM / packaging / costing / formula versions ---

  // BOM lines hang off the ACTIVE formula version, not the project, so a version
  // bump keeps the old composition intact (that is what makes the version-compare
  // feature possible).
  async setBom(
    user: SessionUser,
    id: string,
    lines: ProjectData['bom'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'bom.updated', async (tx, row, project) => {
      if (isGateRefLocked(project, '05')) {
        throw new ForbiddenException('The Formula BOM belongs to gate 05, which has passed — it is read-only (use Backtrack)');
      }
      // The newest version is the current one (F4/Q2: two may be Active at once).
      const active = row.formulaVersions.at(-1);
      if (!active) throw new BadRequestException('Project has no formula version to attach BOM lines to');
      // "From Cosmetri" is a fact about where a line came from, and it exempts the
      // line from F14 reconciliation and from the approved-for-use check — so a
      // client must not be able to claim it (SME rule audit A1, 2026-10-04). Only
      // `importCosmetriBom` creates such lines; here a line may keep the flag only
      // if it matches a line already stored with it, with the two fields Cosmetri
      // owns (supplier, % w/w) unchanged. INCI and CAS stay editable — the import's
      // name join can come back blank or wrong.
      const forged = this.forgedCosmetriLines(project.bom, lines);
      if (forged.length > 0) {
        throw new BadRequestException(
          `Line${forged.length > 1 ? 's' : ''} ${forged.join(', ')} claim${forged.length > 1 ? '' : 's'} to come from Cosmetri but ${forged.length > 1 ? 'do' : 'does'} not match an imported line (supplier and % w/w of an imported line cannot be changed). Use "Import from Cosmetri", or add the material as a manual line.`,
        );
      }
      await tx.bomLine.deleteMany({ where: { formulaVersionId: active.id } });
      if (lines.length > 0) {
        await tx.bomLine.createMany({
          data: lines.map((l, i) => ({
            formulaVersionId: active.id,
            line: i + 1,
            rmCode: l.rmCode,
            inciName: l.inciName,
            casNo: l.casNo ?? null,
            functionRole: l.functionRole,
            supplier: l.supplier,
            percentWw: l.percentWw,
            costPerKg: l.costPerKg,
            evidenceLink: l.evidenceLink ?? null,
            methodRef: l.methodRef ?? null,
            notes: l.notes ?? null,
            fromCosmetri: l.fromCosmetri === true,
            // An imported line is inherently reconciled (F14); only a manual
            // line carries its own flag.
            reconciled: l.fromCosmetri === true || l.reconciled === true,
            rmDisplayName: l.rmDisplayName ?? null,
          })),
        });
      }
      return { version: active.version, lines: lines.length };
    });
  }

  // Incoming lines flagged `fromCosmetri` that no stored imported line accounts
  // for. Matched as a multiset on (rmCode, supplier, % w/w): one formula may list
  // the same material twice, and each stored line can vouch for one incoming line.
  private forgedCosmetriLines(stored: ProjectData['bom'], incoming: ProjectData['bom']): number[] {
    const pool = stored.filter((l) => l.fromCosmetri);
    const forged: number[] = [];
    incoming.forEach((l, i) => {
      if (l.fromCosmetri !== true) return;
      const k = pool.findIndex(
        (s) => s.rmCode === l.rmCode && s.supplier === l.supplier && Number(s.percentWw) === Number(l.percentWw),
      );
      if (k === -1) forged.push(i + 1);
      else pool.splice(k, 1);
    });
    return forged;
  }

  // The Formula BOM import (decision A3, F14), done on the server: the composition
  // is read from Cosmetri HERE, so every `fromCosmetri` line is one the server
  // fetched. Replaces the active version's lines, and in the same transaction adds
  // an identity-only Supplier & RM Evidence row for any imported material that has
  // none — the traceability stub the web used to write as a second, separate save.
  async importCosmetriBom(
    user: SessionUser,
    id: string,
    formulaId: number,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    if (!Number.isInteger(formulaId) || formulaId <= 0) throw new BadRequestException('A Cosmetri formula id is required');
    // Fetched before the transaction: a network call must not hold the row lock.
    const rows: CosmetriImportRow[] = await this.cosmetri.getFormulaImport(formulaId);
    if (rows.length === 0) throw new BadRequestException(`Cosmetri formula ${formulaId} has no composition to import`);

    return this.mutate(user, id, expectedVersion, 'bom.imported_from_cosmetri', async (tx, row, project) => {
      if (isGateRefLocked(project, '05')) {
        throw new ForbiddenException('The Formula BOM belongs to gate 05, which has passed — it is read-only (use Backtrack)');
      }
      // The newest version is the current one (F4/Q2: two may be Active at once).
      const active = row.formulaVersions.at(-1);
      if (!active) throw new BadRequestException('Project has no formula version to attach BOM lines to');

      await tx.bomLine.deleteMany({ where: { formulaVersionId: active.id } });
      await tx.bomLine.createMany({
        data: rows.map((r, i) => ({
          formulaVersionId: active.id,
          line: i + 1,
          rmCode: `RM-${r.rmId}`,
          rmDisplayName: r.code ? `${r.tradeName} | ${r.code}` : r.tradeName,
          inciName: r.inciName,
          casNo: r.casNo || null,
          functionRole: '',
          supplier: r.supplierName,
          percentWw: r.percentWw,
          costPerKg: 0,
          notes: r.qualityStatus !== 'Approved' ? `Cosmetri quality status: ${r.qualityStatus}` : null,
          fromCosmetri: true,
          // An imported line is inherently reconciled (F14).
          reconciled: true,
        })),
      });

      // Traceability stubs. Skipped (and reported) once Gate 4 has passed: that
      // register is then read-only, and adding to it would bypass the same lock
      // the register's own save enforces.
      const evidence = project.registers['supplierRmEvidence'] ?? [];
      const known = new Set(evidence.map((r) => String(r.rmCode ?? '')));
      const missing = rows.filter((r) => {
        const code = `RM-${r.rmId}`;
        if (known.has(code)) return false;
        known.add(code);
        return true;
      });
      const evidenceLocked = isGateRefLocked(project, getRegisterConfig('supplierRmEvidence')?.gate);
      if (missing.length > 0 && !evidenceLocked) {
        await tx.registerRow.createMany({
          data: missing.map((r, i) => ({
            projectId: id,
            registerKey: 'supplierRmEvidence',
            rowOrder: evidence.length + i,
            updatedById: user.id,
            data: {
              ...createEmptyRegisterRow('supplierRmEvidence'),
              rmCode: `RM-${r.rmId}`,
              inciName: r.inciName,
              supplier: r.supplierName,
              grade: r.code ? `${r.tradeName} | ${r.code}` : r.tradeName,
            } as Prisma.InputJsonValue,
          })),
        });
      }
      return {
        version: active.version,
        cosmetriFormulaId: formulaId,
        lines: rows.length,
        evidenceRowsAdded: evidenceLocked ? 0 : missing.length,
        evidenceRowsSkippedGateLocked: evidenceLocked ? missing.length : 0,
      };
    });
  }

  async setPackagingBom(
    user: SessionUser,
    id: string,
    lines: ProjectData['packagingBom'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'packaging_bom.updated', async (tx, _row, project) => {
      if (isGateRefLocked(project, '06')) {
        throw new ForbiddenException('The Packaging BOM belongs to gate 06, which has passed — it is read-only (use Backtrack)');
      }
      // The workbook gives "Approval" a list (Not Started … Not Applicable); a dropdown is only a dropdown in the browser.
      const badApproval = lines.find((l) => (l.approval ?? '') !== '' && !(DECISION_OPTIONS as readonly string[]).includes(l.approval ?? ''));
      if (badApproval) {
        throw new BadRequestException(`Packaging line ${badApproval.line}: "Approval" must be one of ${DECISION_OPTIONS.join(', ')}`);
      }
      await tx.packagingBomLine.deleteMany({ where: { projectId: id } });
      if (lines.length > 0) {
        await tx.packagingBomLine.createMany({
          data: lines.map((l, i) => ({
            projectId: id,
            line: i + 1,
            component: l.component,
            componentType: l.componentType,
            supplier: l.supplier,
            unitsPerFinishedUnit: l.unitsPerFinishedUnit,
            unitCost: l.unitCost,
            wastagePercent: l.wastagePercent,
            leadTime: l.leadTime ?? null,
            moq: l.moq ?? null,
            evidenceLink: l.evidenceLink ?? null,
            methodRef: l.methodRef ?? null,
            notes: l.notes ?? null,
            approval: l.approval ?? null,
          })),
        });
      }
      return { lines: lines.length };
    });
  }

  // Gate 5 / Gate 9 formula property. Gate-locked on '05' — the formula is
  // locked at Gate 5, and this is part of what "the formula" means for
  // preservation. Gate 9 reads the same value but must not be able to change it
  // after Gate 5 has passed.
  async setFormulaProperties(
    user: SessionUser,
    id: string,
    patch: ProjectData['formulaProperties'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'formula-properties.updated', async (tx, _row, project) => {
      if (isGateRefLocked(project, '05')) {
        throw new ForbiddenException(
          'Formula properties belong to gate 05, which has passed — they are read-only (use Backtrack to reopen).',
        );
      }
      const data: Record<string, string | null> = {};
      for (const field of ['microSusceptibility', 'microRationale', 'confirmedProductForm'] as const) {
        if (field in patch) data[field] = (patch[field] ?? '').trim() || null;
      }
      // Question 23(a): the confirmed form is one of the Gate 2 Product Type
      // options — any but "under evaluation", which is what it confirms away from.
      if ('confirmedProductForm' in data) {
        const forms = (PHASE_CONFIGS[1].checklistSections.find((c) => c.key === 'productType')?.options ?? []).filter(
          (o) => o !== PRODUCT_FORM_UNDER_EVALUATION,
        );
        assertOneOf('Confirmed product form', data.confirmedProductForm, forms);
      }
      if (Object.keys(data).length === 0) return { fields: [] };
      await tx.project.update({ where: { id }, data });
      return { fields: Object.keys(data) };
    });
  }

  // Round 4 questions 8, 9, 11 and 12 (2026-08-24): the explicit assessment
  // answers that give question 7's "not yet assessed" state somewhere to live.
  //
  // Deliberately NOT gate-locked, unlike formula properties and costing above. The
  // four answers belong to different gates (12, 8, 3 and 9), so a single gate ref
  // would be wrong for three of them; and each one is read by a Conditional item
  // that BLOCKS while unanswered, so locking it behind a passed gate could strand a
  // project with no way to satisfy the very item demanding the answer. B4 still
  // covers correcting a recorded answer: the change is audited like every other.
  async setAssessments(
    user: SessionUser,
    id: string,
    patch: ProjectData['assessments'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'assessments.updated', async (tx, _row, project) => {
      const data: Record<string, string | null> = {};
      for (const field of ASSESSMENT_FIELDS) {
        // An empty string is stored as NULL, so clearing an answer returns the
        // project to "not yet assessed" rather than leaving a blank that reads as
        // an answer. Only fields actually present in the patch are touched.
        if (field in patch) data[field] = (patch[field] ?? '').trim() || null;
      }
      if (Object.keys(data).length === 0) return { fields: [] };
      for (const [field, allowed] of Object.entries(ASSESSMENT_ANSWER_LISTS)) {
        if (field in data) assertOneOf(field, data[field], allowed);
      }
      // An answer that would make an acknowledged "not applicable" untrue waits for that acknowledgement to be withdrawn
      // (project owner, 2026-11-06), as a target user does.
      const answerPatch: Partial<ProjectData['assessments']> = {};
      for (const [field, value] of Object.entries(data)) (answerPatch as Record<string, string | undefined>)[field] = value ?? undefined;
      const voided = acknowledgementsVoidedByTargetUsers(project, [], answerPatch);
      if (voided.length > 0) throw new BadRequestException(voidedAcknowledgementsMessage(voided));
      if ('familyUseAgeGroups' in data) {
        for (const group of (data.familyUseAgeGroups ?? '').split(',')) {
          assertOneOf('Family use age group', group, FAMILY_USE_AGE_GROUPS);
        }
      }

      // Questions 8 and 11 each attach a condition to one of the answers, and both
      // are enforced here rather than only in the card — BACKEND_PLAN §3 principle
      // 7: the server is the sole authority, and "the UI disables it" is not
      // enforcement. Merged against the stored row, not read from the patch alone,
      // so a partial PUT cannot satisfy a condition by simply omitting the field
      // that fails it.
      // C9: each assessment is answered at its gate, and once that gate has passed
      // the answer is evidence it passed on — changing the family-use age groups
      // after Gate 2 used to switch the whole infant pathway off silently.
      for (const home of ASSESSMENT_HOMES) {
        const touched = ASSESSMENT_FIELDS_BY_KEY[home.key].some(
          (f) => f in data && (data[f] ?? null) !== ((project.assessments[f] ?? '').trim() || null),
        );
        if (touched && isGateRefLocked(project, home.gateId.slice(2))) {
          throw new ForbiddenException(
            `"${home.title}" is answered at ${home.gateId}, which has passed — it is read-only (use Backtrack)`,
          );
        }
      }
      for (const [field, label] of [
        ['administrativeOnlyConfirmedBy', 'Administrative-only "confirmed by"'],
        ['foreseeableContactConfirmedBy', 'Foreseeable contact "confirmed by"'],
        ['familyUseConfirmedBy', 'Family use "confirmed by"'],
        ...UNSTRUCTURED_PMS_CONDITIONS.map((c) => [c.confirmer, `${c.label} "confirmed by"`] as const),
      ] as const) {
        if (field in data) assertSelfAttested(label, project.assessments[field], data[field], user.displayName);
      }
      const merged = { ...project.assessments, ...patch };
      const value = (k: keyof ProjectData['assessments']) => (merged[k] ?? '').trim();

      // Round 5 question 1(d), 2026-11-06: a "No" to a foreseeable-contact or surveillance-condition question must say why. The engine
      // reads a No without a reason as "not yet assessed", so storing one would only look like an answer.
      for (const [answerField, rationaleField, label] of [
        ...UNSTRUCTURED_PMS_CONDITIONS.map((c) => [c.answer, c.rationale, c.label] as const),
      ] as const) {
        if ((answerField in data || rationaleField in data) && value(answerField) === 'No' && value(rationaleField) === '') {
          throw new BadRequestException(`${label}: an answer of No needs its reason`);
        }
      }
      // ...and the person who confirmed it, as Administrative-only does [ASSUMPTION: R6-Q5].
      for (const c of UNSTRUCTURED_PMS_CONDITIONS) {
        if ((c.answer in data || c.rationale in data || c.confirmer in data) && value(c.answer) === 'No' && value(c.confirmer) === '') {
          throw new BadRequestException(`${c.label}: an answer of No must name the person who confirmed it`);
        }
      }

      // A confirmation stands for the words it confirmed (project owner, 2026-11-09 — the same principle as a claim revision and a gate
      // signature). When the answer or reason changes, a carried-over confirmation by someone else is refused: the person confirming
      // the new wording must be the signed-in person, so they record themselves again. A confirmation can only ever be set to yourself
      // (assertSelfAttested above), which is what makes "stale" detectable without a separate column.
      const changed = (k: keyof ProjectData['assessments']) => k in data && (data[k] ?? null) !== ((project.assessments[k] ?? '').trim() || null);
      type AssessmentKeys = keyof ProjectData['assessments'];
      const confirmations: [readonly AssessmentKeys[], AssessmentKeys, string][] = [
        [['administrativeOnly', 'administrativeOnlyRationale'], 'administrativeOnlyConfirmedBy', 'Administrative-only'],
        [['foreseeableContactRationale'], 'foreseeableContactConfirmedBy', 'Foreseeable contact'],
        ...UNSTRUCTURED_PMS_CONDITIONS.map((c): [readonly AssessmentKeys[], AssessmentKeys, string] => [
          [c.answer, c.rationale],
          c.confirmer,
          c.label,
        ]),
      ];
      for (const [contentFields, confirmer, label] of confirmations) {
        const carried = value(confirmer);
        if (contentFields.some(changed) && carried !== '' && carried !== user.displayName) {
          throw new BadRequestException(
            `${label}: the answer or reason changed, which withdraws ${carried}'s confirmation — confirm it again yourself`,
          );
        }
      }

      // Question 11: "The classification must be confirmed by an authorised
      // reviewer." An unconfirmed Yes is not an exemption, so it must not be
      // storable as one — the competitor-review trigger reads all three fields. The reason is what the reviewer is confirming: that
      // "no claim, formula, market positioning, product performance, packaging function or customer-facing meaning changes".
      if (value('administrativeOnly') === 'Yes' && value('administrativeOnlyConfirmedBy') === '') {
        throw new BadRequestException(
          'An administrative-only classification must name the authorised reviewer who confirmed it (Round 4, question 11)',
        );
      }
      if (value('administrativeOnly') === 'Yes' && value('administrativeOnlyRationale') === '') {
        throw new BadRequestException(
          'An administrative-only classification must give the reason the reviewer is confirming — that no claim, formula, market positioning, product performance, packaging function or customer-facing meaning changes (Round 4, question 11)',
        );
      }
      // Foreseeable contact [ASSUMPTION: R6-Q5]: a reason nobody has confirmed decides nothing, so it is not storable as an answer.
      if (value('foreseeableContactRationale') !== '' && value('foreseeableContactConfirmedBy') === '') {
        throw new BadRequestException('A foreseeable-contact reason must name the person who confirmed it');
      }

      await tx.project.update({ where: { id }, data });
      return { fields: Object.keys(data) };
    });
  }

  // Round 5 question 7: the scale-up / pilot assessment of Gate 9, one entry per affected area. The whole list is replaced, like a
  // register: an entry missing from it is removed, and the audit event names what was added, changed and removed. What is wrong with an
  // entry is the shared `scaleUpAssessmentProblems`, the one function the screen reads too. Who assessed an entry is an act, so it can
  // only be the person saving; and the three confirmations that waive a separate pilot on a new formula are each given by the holder of
  // that function on this project, as themselves — changing the justification or its evidence withdraws them (a confirmation vouches
  // for what it was given on).
  async setScaleUpAssessments(
    user: SessionUser,
    id: string,
    entries: ScaleUpAssessment[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'scale_up_assessments.updated', async (tx, _row, project) => {
      // Answered at Gate 9 (C9): once it has passed the answers are evidence it passed on.
      if (isGateRefLocked(project, '09')) {
        throw new ForbiddenException('The scale-up assessment is answered at SG09, which has passed — it is read-only (use Backtrack)');
      }
      const t = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
      const opt = (v: unknown): string | undefined => t(v) || undefined;
      const before = new Map(project.scaleUpAssessments.map((a) => [a.id, a]));
      const clean: ScaleUpAssessment[] = entries.map((e) => {
        const old = before.get(typeof e.id === 'string' ? e.id : '');
        const entry: ScaleUpAssessment = {
          id: typeof e.id === 'string' ? e.id : '',
          area: t(e.area),
          description: opt(e.description),
          before: opt(e.before),
          after: opt(e.after),
          answer: t(e.answer),
          rationale: opt(e.rationale),
          verification: opt(e.verification),
          evidenceLink: opt(e.evidenceLink),
          assessor: opt(e.assessor),
          assessedDate: opt(e.assessedDate),
          timing: opt(e.timing),
          linkedChangeId: opt(e.linkedChangeId),
          linkedIteration: opt(e.linkedIteration),
          waiverJustification: opt(e.waiverJustification),
          waiverEvidenceLink: opt(e.waiverEvidenceLink),
          waiverQualityBy: opt(e.waiverQualityBy),
          waiverManufacturingBy: opt(e.waiverManufacturingBy),
          waiverRiBy: opt(e.waiverRiBy),
        };
        // A confirmation stands only for the justification and evidence it was given on.
        const waiverMoved =
          !!old && (t(old.waiverJustification) !== t(entry.waiverJustification) || t(old.waiverEvidenceLink) !== t(entry.waiverEvidenceLink));
        for (const r of SCALE_UP_WAIVER_ROLES) {
          if (waiverMoved && t(entry[r.field]) === t(old?.[r.field])) entry[r.field] = undefined;
        }
        return entry;
      });
      const problems = scaleUpAssessmentProblems(clean, { changeIds: project.changes.map((c) => c.changeId), newFormula: isNewFormula(project) });
      if (problems.length > 0) throw new BadRequestException(bulletList(problems));

      for (const e of clean) {
        const old = before.get(e.id);
        assertSelfAttested('Scale-up assessor', old?.assessor, e.assessor, user.displayName);
        for (const r of SCALE_UP_WAIVER_ROLES) {
          const next = t(e[r.field]);
          if (next === '' || next === t(old?.[r.field])) continue;
          assertSelfAttested(`${r.label} confirmation`, old?.[r.field], next, user.displayName);
          await this.assertHoldsFunction(tx, id, user, [r.functionKey], `confirm the waiver as ${r.label}`);
        }
      }

      const keep = new Set(clean.map((e) => e.id).filter((x) => before.has(x)));
      const removed = project.scaleUpAssessments.filter((a) => !keep.has(a.id));
      if (removed.length > 0) {
        await tx.scaleUpAssessment.deleteMany({ where: { projectId: id, id: { in: removed.map((a) => a.id) } } });
      }
      const added: string[] = [];
      const changed: string[] = [];
      for (const [index, e] of clean.entries()) {
        const data = {
          sortOrder: index,
          area: e.area,
          description: e.description ?? null,
          before: e.before ?? null,
          after: e.after ?? null,
          answer: e.answer,
          rationale: e.rationale ?? null,
          verification: e.verification ?? null,
          evidenceLink: e.evidenceLink ?? null,
          assessor: e.assessor ?? null,
          assessedDate: e.assessedDate ?? null,
          timing: e.timing ?? null,
          linkedChangeId: e.linkedChangeId ?? null,
          linkedIteration: e.linkedIteration ?? null,
          waiverJustification: e.waiverJustification ?? null,
          waiverEvidenceLink: e.waiverEvidenceLink ?? null,
          waiverQualityBy: e.waiverQualityBy ?? null,
          waiverManufacturingBy: e.waiverManufacturingBy ?? null,
          waiverRiBy: e.waiverRiBy ?? null,
        };
        const old = before.get(e.id);
        if (old) {
          await tx.scaleUpAssessment.update({ where: { id: e.id }, data });
          if (JSON.stringify({ ...old, id: undefined }) !== JSON.stringify({ ...e, id: undefined })) changed.push(e.area);
        } else {
          await tx.scaleUpAssessment.create({ data: { projectId: id, ...data } });
          added.push(e.area);
        }
      }
      return {
        added,
        changed,
        removed: removed.map((a) => ({ area: a.area, answer: a.answer, assessor: a.assessor ?? null })),
        count: clean.length,
      };
    });
  }

  // Round 4 question 8, listed per post-market finding (2026-10-13). The whole list is replaced, like
  // a register: existing entries keep their id, a new one has none, and anything missing from the list is
  // removed — the audit event names what was added, changed and removed, so nothing disappears silently.
  // The same shared function that the Gate 12 block reads decides what is wrong with an entry
  // (changeControlAssessmentProblems), so the screen and this refusal cannot disagree.
  async setChangeControlAssessments(
    user: SessionUser,
    id: string,
    entries: ChangeControlAssessment[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'change_control_assessments.updated', async (tx, _row, project) => {
      // Answered at Gate 12 (C9): once it has passed the answers are evidence it passed on.
      if (isGateRefLocked(project, '12')) {
        throw new ForbiddenException(
          'The Change Control assessment is answered at SG12, which has passed — it is read-only (use Backtrack)',
        );
      }
      const clean = entries.map((e) => ({
        id: typeof e.id === 'string' ? e.id : '',
        finding: (e.finding ?? '').trim(),
        category: (e.category ?? '').trim() || undefined,
        sourceRecord: (e.sourceRecord ?? '').trim() || undefined,
        dateIdentified: (e.dateIdentified ?? '').trim() || undefined,
        affected: (e.affected ?? '').trim() || undefined,
        markets: assessmentMarkets(e).join(', ') || undefined,
        reviewCycle: (e.reviewCycle ?? '').trim() || undefined,
        severity: (e.severity ?? '').trim() || undefined,
        disposition: (e.disposition ?? '').trim() || undefined,
        answer: (e.answer ?? '').trim(),
        linkedRecordId: (e.linkedRecordId ?? '').trim() || undefined,
        reviewer: (e.reviewer ?? '').trim() || undefined,
        reviewDate: (e.reviewDate ?? '').trim() || undefined,
        rationale: (e.rationale ?? '').trim() || undefined,
        evidenceLink: (e.evidenceLink ?? '').trim() || undefined,
      }));
      const problems = changeControlAssessmentProblems(clean, {
        changeIds: project.changes.map((c) => c.changeId),
        markets: project.identity.markets,
        reviewCycles: reviewCycleOptions(project, {
          enhanced: evaluateTrigger(project, 'pvPmsRequired') === 'applies',
          asOf: new Date().toISOString().slice(0, 10),
          profiles: project.reference.marketProfiles,
        }).map((o) => o.key),
      });
      if (problems.length > 0) throw new BadRequestException(bulletList(problems));

      const before = new Map(project.changeControlAssessments.map((a) => [a.id, a]));
      // Who reviewed is an act, so a reviewer that is new or changed must be the person saving (C6).
      for (const e of clean) {
        assertSelfAttested('Change Control reviewer', before.get(e.id)?.reviewer, e.reviewer, user.displayName);
      }
      const keep = new Set(clean.map((e) => e.id).filter((x) => before.has(x)));
      const removed = project.changeControlAssessments.filter((a) => !keep.has(a.id));
      if (removed.length > 0) {
        await tx.changeControlAssessment.deleteMany({ where: { projectId: id, id: { in: removed.map((a) => a.id) } } });
      }
      const added: string[] = [];
      const changed: string[] = [];
      // The Finding ID is generated here and never taken from the client (Round 5 question 2(c)): the next number after the highest
      // one this project has used, so removing a finding never frees its ID for another.
      const usedNumbers = project.changeControlAssessments
        .map((a) => Number(/^FND-(\d+)$/.exec(a.findingId ?? '')?.[1] ?? 0))
        .filter((n) => n > 0);
      let nextNumber = (usedNumbers.length ? Math.max(...usedNumbers) : 0) + 1;
      for (const [index, e] of clean.entries()) {
        const existing = before.get(e.id);
        const findingId = existing?.findingId || `FND-${String(nextNumber++).padStart(3, '0')}`;
        const data = {
          sortOrder: index,
          findingId,
          finding: e.finding,
          category: e.category ?? null,
          sourceRecord: e.sourceRecord ?? null,
          dateIdentified: e.dateIdentified ?? null,
          affected: e.affected ?? null,
          markets: e.markets ?? null,
          reviewCycle: e.reviewCycle ?? null,
          severity: e.severity ?? null,
          disposition: e.disposition ?? null,
          answer: e.answer,
          linkedRecordId: e.linkedRecordId ?? null,
          reviewer: e.reviewer ?? null,
          reviewDate: e.reviewDate ?? null,
          rationale: e.rationale ?? null,
          evidenceLink: e.evidenceLink ?? null,
        };
        if (before.has(e.id)) {
          await tx.changeControlAssessment.update({ where: { id: e.id }, data });
          const old = before.get(e.id)!;
          if (JSON.stringify({ ...old, id: undefined, findingId: undefined }) !== JSON.stringify({ ...e, id: undefined })) changed.push(e.finding);
        } else {
          await tx.changeControlAssessment.create({ data: { projectId: id, ...data } });
          added.push(e.finding);
        }
      }
      return {
        added,
        changed,
        removed: removed.map((a) => ({ finding: a.finding, answer: a.answer, reviewer: a.reviewer ?? null })),
        count: clean.length,
      };
    });
  }

  async setCosting(
    user: SessionUser,
    id: string,
    patch: Partial<ProjectData['costing']>,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'costing.updated', async (tx, _row, project) => {
      if (isGateRefLocked(project, '05')) {
        throw new ForbiddenException('Costing belongs to gate 05, which has passed — it is read-only (use Backtrack)');
      }
      // Round 4 question 36(b) added five non-numeric fields to this record, and
      // two of them cannot go straight through: `reviewDate` is a `@db.Date`
      // column that arrives as a 'YYYY-MM-DD' string, and `feasibilityStatus` is
      // a controlled list — an unrecognised value would silently never satisfy
      // `costingStatusRecorded`, the same failure sweep S1 exists to catch in
      // config.
      const { reviewDate, feasibilityStatus, assessor, assumptions, evidenceLink, ...numbers } = patch;
      if (
        feasibilityStatus !== undefined &&
        feasibilityStatus !== '' &&
        !COSTING_FEASIBILITY_STATUSES.includes(feasibilityStatus as (typeof COSTING_FEASIBILITY_STATUSES)[number])
      ) {
        throw new BadRequestException(
          `Unknown costing status "${feasibilityStatus}" — expected one of: ${COSTING_FEASIBILITY_STATUSES.join(', ')}`,
        );
      }
      await tx.costingInputs.update({
        where: { projectId: id },
        data: {
          ...numbers,
          ...(feasibilityStatus !== undefined ? { feasibilityStatus: feasibilityStatus || null } : {}),
          ...(assessor !== undefined ? { assessor: assessor || null } : {}),
          ...(assumptions !== undefined ? { assumptions: assumptions || null } : {}),
          ...(evidenceLink !== undefined ? { evidenceLink: evidenceLink || null } : {}),
          ...(reviewDate !== undefined ? { reviewDate: reviewDate ? new Date(reviewDate) : null } : {}),
        },
      });
      return { fields: Object.keys(patch) };
    });
  }

  // Gate 1 opportunity capture (2026-08-09, SME Round 3 B1/B2/B3). The FIRST
  // identity-mutation path in the system: identity was previously write-once at
  // POST /projects and had no update route at all.
  //
  // Only the Gate-1 free-text fields are writable ('initialTargetMarkets' was
  // the fifth until Round 4 question 24 removed it, 2026-08-29). The identifying fields
  // (productCode, projectLead, productSku, markets, reviewers, ...) stay
  // write-once deliberately — changing them is a different, larger question
  // than "record where this request came from", and nothing in Round 3 asked
  // for it. Gate-locked on gate '01' like every other gate-1 evidence surface,
  // so correcting it after Gate 1 passes requires Backtrack (rule B4).
  async setIdentity(
    user: SessionUser,
    id: string,
    patch: Partial<ProjectData['identity']>,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'identity.updated', async (tx, _row, project) => {
      if (isGateRefLocked(project, '01')) {
        throw new ForbiddenException(
          'The opportunity and request record belongs to gate 01, which has passed — it is read-only (use Backtrack to reopen it).',
        );
      }
      // Request origin and project nature are NOT here: they became gate-01
      // checklist sections on 2026-08-10 and go through setChecklistSection,
      // which carries the same gate-01 lock.
      const writable = [
        'requesterName',
        'requesterDepartment',
        'initialScope',
        'initialTargetUsers',
      ] as const;
      const data: Record<string, string | null> = {};
      for (const field of writable) {
        if (field in patch) data[field] = (patch[field] ?? '').trim() || null;
      }
      if (Object.keys(data).length === 0) return { fields: [] };
      await tx.project.update({ where: { id }, data });
      return { fields: Object.keys(data) };
    });
  }

  // Who holds each FUNCTION on the project (Safety / Scientific Review, Technical Claims, Quality, …), assigned or changed
  // after creation by the project's Lead or an administrator (2026-11-05, Round 5 questions 1(b) and 37(b)). Only function
  // roles: the thirteen area roles are write-once at creation and stay so. A function with nobody in it reads Unassigned
  // and whatever needs that authority waits; nobody is substituted for it, the Lead included.
  async setFunctionAssignees(
    user: SessionUser,
    id: string,
    assignments: { roleKey: string; userId: string | null }[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'project.function_assignees_updated', async (tx, _row, project) => {
      if (project.identity.projectLead.trim() !== user.displayName.trim() && !this.permissions.isAdmin(user)) {
        throw new ForbiddenException(`Only the project's Lead (${project.identity.projectLead}) or an administrator may assign functions`);
      }
      if (!Array.isArray(assignments) || assignments.length === 0) {
        throw new BadRequestException('assignments must list at least one function');
      }
      const allowed = new Set(LEAD_ASSIGNABLE_ROLE_KEYS);
      const changes: { roleKey: string; before: string | null; after: string | null }[] = [];
      for (const a of assignments) {
        if (!allowed.has(a.roleKey)) {
          throw new BadRequestException(`"${a.roleKey}" is not a role the Lead assigns after creation — only the functions and the Project owner can be changed once the project exists`);
        }
        const key = { projectId_roleKey: { projectId: id, roleKey: a.roleKey } };
        const before = await tx.projectReviewer.findUnique({ where: key });
        if (a.userId === null) {
          if (before) {
            await tx.projectReviewer.delete({ where: key });
            changes.push({ roleKey: a.roleKey, before: before.name, after: null });
          }
          continue;
        }
        const person = await tx.user.findUnique({ where: { id: a.userId } });
        // Any active user may hold a function: the SME's "company role matrix" (question 37(b)) may mean a limit to people holding
        // a matching company role, which is not applied yet [ASSUMPTION: R6-Q3].
        if (!person || !person.active) throw new BadRequestException('That person is not an active user');
        if (before?.userId === person.id) continue;
        await tx.projectReviewer.upsert({
          where: key,
          create: { projectId: id, roleKey: a.roleKey, name: person.displayName, userId: person.id },
          update: { name: person.displayName, userId: person.id, assignedAt: new Date() },
        });
        changes.push({ roleKey: a.roleKey, before: before?.name ?? null, after: person.displayName });
      }
      return { changes };
    });
  }

  // Countries / Markets after creation (Round 4 question 24, 2026-08-29).
  //
  // This route exists BECAUSE of that answer, and would be wrong without it: the
  // parameter used to be mandatory at POST /projects and write-once thereafter,
  // which is coherent. Now that creation no longer requires it — "not mandatory
  // to create the initial project shell, but becomes mandatory before Gate 1
  // passes" — a project can be opened with no markets, and something has to be
  // able to record them, or the Gate 1 item is unsatisfiable rather than merely
  // unsatisfied.
  //
  // Gate-01 locked like the opportunity fields, so correcting the list after
  // Gate 1 passes needs Backtrack (B4). Adding a market creates its MarketTrack
  // row exactly the way project-scaffold does, against the CURRENT formula
  // version rather than the initial one.
  //
  // Removing one is guarded rather than free: a market whose track has recorded
  // any approval state would take that state with it, and there is no undo. Same
  // dependency guard as un-ticking a target user the Vulnerable-User Assessment
  // depends on, and as deleting a Supplier & RM Evidence row the BOM still uses.
  async setMarkets(
    user: SessionUser,
    id: string,
    markets: string[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'markets.updated', async (tx, row, project) => {
      const wanted = [...new Set(markets.map((m) => m.trim()).filter((m) => m !== ''))];
      const current = row.markets.map((m) => m.market);
      const removed = current.filter((m) => !wanted.includes(m));
      const added = wanted.filter((m) => !current.includes(m));
      // F4: "adding a market creates a new track" — so ADDING stays open after
      // Gate 1 (SME rule audit D, 2026-10-04); only removal is a Gate 1 decision.
      // Whether an added market must re-open earlier gates ("may re-trigger
      // earlier gates if that market differs") is not built [ASSUMPTION: R5-Q49].
      if (removed.length > 0 && isGateRefLocked(project, '01')) {
        throw new ForbiddenException(
          'Removing a market belongs to gate 01, which has passed — mark the market Withdrawn on Market Regulatory & Launch Tracking instead.',
        );
      }

      if (removed.length > 0) {
        const tracks = await tx.marketTrack.findMany({
          where: { projectId: id, market: { in: removed } },
        });
        const inUse = tracks.filter(
          (t) =>
            t.pifStatus !== 'Not Started' ||
            t.regulatoryStatus !== 'Not Started' ||
            t.claimsApproval !== 'Not Started' ||
            t.launchApproval !== 'Not Started' ||
            !!t.regulatoryNotes ||
            // F4: a market with any history is never deleted — it is marked
            // Withdrawn with a reason. The dates and the per-market records below
            // were not looked at, so a Backtrack to Gate 1 could erase a launched
            // market (SME rule audit D, 2026-10-04).
            !!t.pifApprovedDate ||
            !!t.launchApprovedDate ||
            !!t.actualLaunchDate ||
            !!t.withdrawnDate,
        );
        const withRecords = removed.filter(
          (m) =>
            project.gateSignOffs.some((g) => g.market === m) ||
            project.postLaunchReviews.some((r) => r.market === m) ||
            project.supersessionDecisions.some((d) => d.market === m) ||
            // The market's own requirement rows, Key Gate Checks, checklist options and next actions are records too.
            project.nextActions.some((a) => a.market === m) ||
            project.gateChecks.some((c) => c.market === m && (c.done || !!c.notes || !!c.evidenceRef)) ||
            Object.values(project.checklists).some((items) => items.some((i) => i.market === m && (i.selected || !!i.notes || !!i.evidenceLink))) ||
            Object.values(project.requirements).some((rows) =>
              rows.some((r) => r.market === m && (r.status !== 'Not Started' || !!r.notes || !!r.evidenceLink)),
            ),
        );
        const blocked = [...new Set([...inUse.map((t) => t.market), ...withRecords])];
        if (blocked.length > 0) {
          throw new BadRequestException(
            blocked
              .map(
                (m) =>
                  `Cannot remove "${m}": it already has recorded progress, sign-offs or reviews — mark it Withdrawn with a reason on Market Regulatory & Launch Tracking instead`,
              )
              .join('\n'),
          );
        }
        await tx.marketTrack.deleteMany({ where: { projectId: id, market: { in: removed } } });
        await tx.projectMarket.deleteMany({ where: { projectId: id, market: { in: removed } } });
      }

      if (added.length > 0) {
        const version = await tx.formulaVersion.findFirst({
          where: { projectId: id },
          orderBy: { createdAt: 'desc' },
        });
        await tx.projectMarket.createMany({ data: added.map((market) => ({ projectId: id, market })) });
        await tx.marketTrack.createMany({
          data: added.map((market) => ({ projectId: id, market, formulaVersionId: version?.id })),
        });
      }
      // The rows a section makes per market follow the project's markets: a new market gets its own, a removed one's go.
      if (added.length > 0 || removed.length > 0) {
        await this.syncMarketRequirementRows(tx, id, wanted);
        await this.syncMarketGateChecks(tx, id, wanted);
        await this.syncMarketChecklists(tx, id, wanted);
      }
      return { added, removed };
    });
  }

  // Rows a requirement section makes per market (RequirementRowConfig.marketScope) for the project's markets as they now stand. Rows that
  // still apply keep what was recorded on them and take their new place; rows of a removed market go (removal is refused while they hold
  // records); a new market gets fresh ones. Two passes so the unique (section, order) is never violated midway.
  private async syncMarketRequirementRows(tx: Prisma.TransactionClient, projectId: string, markets: string[]): Promise<void> {
    for (const config of Object.values(PHASE_CONFIGS)) {
      for (const section of config.requirementSections) {
        if (!section.rows.some((r) => r.marketScope)) continue;
        const desired = expandRequirementRows(section.rows, markets);
        const wanted = new Set(desired.map((d) => requirementRowKey(d.row.requirement, d.market)));
        const existing = await tx.requirementItem.findMany({ where: { projectId, sectionKey: section.key }, orderBy: { itemOrder: 'asc' } });
        const byKey = new Map(existing.map((e) => [requirementRowKey(e.requirement, e.market ?? undefined), e]));
        for (const e of existing) {
          if (!wanted.has(requirementRowKey(e.requirement, e.market ?? undefined))) await tx.requirementItem.delete({ where: { id: e.id } });
          else await tx.requirementItem.update({ where: { id: e.id }, data: { itemOrder: 100000 + e.itemOrder } });
        }
        for (const [index, d] of desired.entries()) {
          const found = byKey.get(requirementRowKey(d.row.requirement, d.market));
          if (found) await tx.requirementItem.update({ where: { id: found.id }, data: { itemOrder: index } });
          else {
            await tx.requirementItem.create({
              data: {
                projectId,
                sectionKey: section.key,
                itemOrder: index,
                gate: d.row.gate,
                requirement: d.row.requirement,
                minimumRequirement: d.row.minimum,
                rationale: d.row.rationale,
                owner: d.row.owner,
                market: d.market ?? null,
              },
            });
          }
        }
      }
    }
  }

  // Key Gate Checks the configuration makes per market, for the project's markets as they now stand: a new market gets its own row, a
  // removed one's goes (removal is refused while it holds a record), the rest are untouched.
  private async syncMarketGateChecks(tx: Prisma.TransactionClient, projectId: string, markets: string[]): Promise<void> {
    const scoped = Object.values(PHASE_CONFIGS).flatMap((c) => c.keyGateChecks).filter((kc) => kc.marketScope);
    if (scoped.length === 0) return;
    const desired = expandGateChecks(scoped, markets);
    const wanted = new Set(desired.map((d) => gateCheckRowKey(d.check.gate, d.check.check, d.market)));
    const existing = await tx.gateCheck.findMany({
      where: { projectId, OR: scoped.map((kc) => ({ gate: kc.gate, check: kc.check })) },
    });
    const have = new Set(existing.map((e) => gateCheckRowKey(e.gate, e.check, e.market ?? undefined)));
    for (const e of existing) {
      if (!wanted.has(gateCheckRowKey(e.gate, e.check, e.market ?? undefined))) await tx.gateCheck.delete({ where: { id: e.id } });
    }
    for (const d of desired) {
      if (!have.has(gateCheckRowKey(d.check.gate, d.check.check, d.market))) {
        await tx.gateCheck.create({ data: { projectId, gate: d.check.gate, check: d.check.check, market: d.market ?? null } });
      }
    }
  }

  // The checklists the configuration makes per market: every option once for each market, a market's own together. Kept options take
  // their new place; a removed market's go; a new market gets a fresh list. Two passes so (section, order) is never duplicated midway.
  private async syncMarketChecklists(tx: Prisma.TransactionClient, projectId: string, markets: string[]): Promise<void> {
    for (const config of Object.values(PHASE_CONFIGS)) {
      for (const section of config.checklistSections) {
        if (!section.marketScope) continue;
        const desired = expandChecklistOptions(section, markets);
        const wanted = new Set(desired.map((d) => checklistItemKey(d.label, d.market)));
        const existing = await tx.checklistItem.findMany({ where: { projectId, sectionKey: section.key }, orderBy: { itemOrder: 'asc' } });
        const byKey = new Map(existing.map((e) => [checklistItemKey(e.label, e.market ?? undefined), e]));
        for (const e of existing) {
          if (!wanted.has(checklistItemKey(e.label, e.market ?? undefined))) await tx.checklistItem.delete({ where: { id: e.id } });
          else await tx.checklistItem.update({ where: { id: e.id }, data: { itemOrder: 100000 + e.itemOrder } });
        }
        for (const [index, d] of desired.entries()) {
          const found = byKey.get(checklistItemKey(d.label, d.market));
          if (found) await tx.checklistItem.update({ where: { id: found.id }, data: { itemOrder: index } });
          else {
            await tx.checklistItem.create({
              data: {
                projectId,
                sectionKey: section.key,
                itemOrder: index,
                label: d.label,
                gate: section.gate,
                ownerFunction: section.ownerFunction,
                market: d.market ?? null,
              },
            });
          }
        }
      }
    }
  }

  // --- Phase 5: next actions / market tracks / study approvals ---

  // Replaces the actions for the given gates only — the card shows a per-phase
  // filtered subset, so other gates' actions must survive untouched.
  async setNextActions(
    user: SessionUser,
    id: string,
    gateIds: string[],
    actions: ProjectData['nextActions'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'next_actions.updated', async (tx, _row, project) => {
      // F8 and B4, enforced here (SME rule audit B24, 2026-10-04). Before this the
      // server stored whatever arrived: anyone could delete or cancel a Critical
      // action — the one kind that blocks a gate even under Proceed with
      // Conditions — the owner could verify their own action, `verifiedBy` was
      // whatever name the browser sent, and adding or removing actions on a gate
      // that had already passed flipped its pass state with no Backtrack.
      actions = await this.guardNextActions(user, project, gateIds, actions);
      // Update in place rather than delete-and-recreate (2026-10-04 fix): safety
      // findings and watch-list rows link to an action by its id
      // (`linkedNextActionId`), so recreating every action under a new id broke
      // every such link on each save and re-blocked the gates they had cleared.
      const existing = await tx.nextAction.findMany({
        where: { projectId: id, gateId: { in: gateIds } },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((e) => e.id));
      const keep = new Set(actions.map((a) => a.id).filter((a) => existingIds.has(a)));
      await tx.nextAction.deleteMany({
        where: { projectId: id, gateId: { in: gateIds }, id: { notIn: [...keep] } },
      });
      // An action may name a market only on a gate signed per market, and only one of the project's; blank = every market.
      for (const a of actions) {
        const m = (a.market ?? '').trim();
        if (m === '') continue;
        if (!isPerMarketGate(a.gateId)) {
          throw new BadRequestException(`Action "${a.description}": ${a.gateId} is not signed per market, so an action there cannot name a market`);
        }
        if (!project.identity.markets.includes(m)) {
          throw new BadRequestException(`Action "${a.description}": "${m}" is not one of this project's markets`);
        }
      }
      for (const a of actions) {
        const data = {
          gateId: a.gateId,
          market: (a.market ?? '').trim() || null,
          description: a.description,
          owner: a.owner ?? null,
          dueDate: this.dateOrNull(a.dueDate),
          status: a.status,
          priority: a.priority,
          dateCompleted: this.dateOrNull(a.dateCompleted),
          raisedBy: a.raisedBy ?? null,
          verifiedBy: a.verifiedBy ?? null,
          completionCriteria: a.completionCriteria ?? null,
          escalationTrigger: a.escalationTrigger ?? null,
          evidenceLink: a.evidenceLink ?? null,
        };
        if (keep.has(a.id)) {
          await tx.nextAction.update({ where: { id: a.id }, data });
        } else {
          // A new action keeps the id the client gave it (so a link made in the
          // same session still resolves), unless that id is already used by
          // another record anywhere.
          const taken = a.id ? await tx.nextAction.findUnique({ where: { id: a.id }, select: { id: true } }) : null;
          await tx.nextAction.create({ data: { ...data, projectId: id, ...(a.id && !taken ? { id: a.id } : {}) } });
        }
      }
      return { gates: gateIds, actions: actions.length };
    });
  }

  private async guardNextActions(
    user: SessionUser,
    project: ProjectData,
    gateIds: string[],
    incoming: ProjectData['nextActions'],
  ): Promise<ProjectData['nextActions']> {
    const terminal = (status: string) => NEXT_ACTION_TERMINAL_STATUSES.includes(status as NextActionStatus);
    const before = new Map(project.nextActions.map((a) => [a.id, a]));
    const incomingIds = new Set(incoming.map((a) => a.id));

    // Who may change or delete an action's record (project owner's rule, 2026-10-07):
    // its creator, the project Lead or an administrator. Status is F8's, below.
    const actor = {
      displayName: user.displayName,
      isProjectLead: project.identity.projectLead.trim() === user.displayName.trim(),
      isAdmin: this.permissions.isAdmin(user),
    };

    // Removal. An open Critical action is closed by cancelling it, which carries a
    // verifier; deleting it would make the block vanish with no trail. And nothing
    // tied to a passed gate is deleted (B4: no silent corrections).
    for (const old of project.nextActions.filter((a) => gateIds.includes(a.gateId) && !incomingIds.has(a.id))) {
      // Raiser-only deletion (SW-40).
      if (!mayRemoveNextAction(old, actor)) {
        throw new ForbiddenException(
          `Action "${old.description}" can only be removed by the person who raised it (${old.raisedBy ?? 'unrecorded'})`,
        );
      }
      if (old.priority === 'Critical' && !terminal(old.status)) {
        throw new BadRequestException(
          `Critical action "${old.description}" cannot be deleted while open — cancel it instead, which records who verified it`,
        );
      }
      if (isGatePassed(project, old.gateId)) {
        throw new BadRequestException(
          `Action "${old.description}" belongs to ${old.gateId}, which has passed — it cannot be deleted (use Backtrack)`,
        );
      }
    }

    // Creation. A gate's OPEN actions are part of the evidence snapshot its three
    // signatures attest to (gateSnapshot.ts), so a new one on a passed gate makes
    // all three stale — and a passed gate cannot be re-signed ("not the gate
    // currently open for work"), leaving the lane permanently stale with no way
    // out. Progressing or closing an action that already exists stays open, which is
    // what a gate carrying conditions needs (SW-19 limits what may change); only
    // adding is refused.
    //
    // Our reading of B2 ("open actions may exist only if the gate decision is
    // Proceed with Conditions"), which speaks about actions EXISTING, not about
    // raising one after the gate has passed. Project owner's decision, 2026-10-05:
    // refuse it for both decisions and use Backtrack. [ASSUMPTION: R5-Q57]
    for (const a of incoming) {
      if (before.has(a.id)) continue;
      if (isGatePassed(project, a.gateId)) {
        throw new BadRequestException(
          `${a.gateId} has passed — a new next action cannot be added to it; reopen the gate with Backtrack`,
        );
      }
    }

    const result: ProjectData['nextActions'] = [];
    const passedCache = new Map<string, boolean>();
    const gatePassed = (gateId: string) => {
      if (!passedCache.has(gateId)) passedCache.set(gateId, isGatePassed(project, gateId));
      return passedCache.get(gateId) as boolean;
    };
    for (const a of incoming) {
      const old = before.get(a.id);
      // SW-19: after its gate has passed a closed or cancelled action is frozen, and an
      // open one (a condition the approval accepted) can only have its Status,
      // Owner and Due date changed. [ASSUMPTION: R5-Q59]
      if (old && gatePassed(old.gateId)) {
        const frozen = nextActionFreezeViolation(old, a);
        if (frozen) throw new BadRequestException(frozen);
      }
      if (old && nextActionRecordChanged(old, a) && !mayEditNextActionRecord(old, actor)) {
        throw new ForbiddenException(
          `Action "${old.description}" can only be edited by whoever created it (${old.raisedBy ?? 'unrecorded'}), the project Lead or a System Administrator — its Status can still be updated`,
        );
      }
      // Attribution is the server's: the raiser is whoever first saved the action,
      // the verifier whoever moved it to Closed or Cancelled.
      // An action saved before this rule has no raiser on record; it stays
      // unattributed rather than being credited to whoever saves it next.
      const raisedBy = old ? old.raisedBy : user.displayName;
      let verifiedBy = old?.verifiedBy;
      const entering = terminal(a.status) && !(old && terminal(old.status));
      if (entering) {
        // "The owner cannot unilaterally verify closure where independent
        // confirmation is required." Applied to every action — when independent
        // confirmation is NOT required is not stated [ASSUMPTION: R5-Q39].
        if ((a.owner ?? '').trim() !== '' && a.owner === user.displayName) {
          throw new BadRequestException(
            `"${a.description}": you own this action, so someone else — its raiser, the gate owner or an authorised reviewer — must verify and close it (F8)`,
          );
        }
        // F8: the raiser, the relevant gate owner or an authorised reviewer verifies
        // and closes — for every priority (F8 does not tier this by priority).
        // "Authorised reviewer" is read as someone who may decide this gate, the only
        // per-gate authorisation the app has [ASSUMPTION: R5-Q39]. Since SW-37 that is
        // the gate's nominated Approved-by signer, the project Lead or an administrator
        // (the same function the screen reads), not a Role Editor grant.
        const gateOwner = project.gates.find((g) => g.gateId === a.gateId)?.owner;
        const allowed =
          user.displayName === raisedBy ||
          (!!gateOwner && user.displayName === gateOwner) ||
          canDecideGateInProject(project, a.gateId, {
            displayName: user.displayName,
            isAdmin: this.permissions.isAdmin(user),
          });
        if (!allowed) {
          throw new ForbiddenException(
            `"${a.description}": only its raiser, the ${a.gateId} gate owner or an authorised reviewer (someone who may decide ${a.gateId}) can close or cancel it (F8)`,
          );
        }
        verifiedBy = user.displayName;
      } else if (!terminal(a.status)) {
        // Re-opened (or never closed): no verification stands.
        verifiedBy = undefined;
      }
      result.push({ ...a, raisedBy, verifiedBy });
    }

    // A gate that has passed must still pass after this save — otherwise adding
    // an open action to it, or raising one to Critical, quietly un-passes it.
    const after: ProjectData = {
      ...project,
      nextActions: [...project.nextActions.filter((a) => !gateIds.includes(a.gateId)), ...result],
    };
    const flipped = project.gates
      .filter((g) => isGatePassed(project, g.gateId) && !isGatePassed(after, g.gateId))
      .map((g) => g.gateId);
    if (flipped.length > 0) {
      throw new BadRequestException(
        `This change would un-pass ${flipped.join(', ')}, which has already passed — reopen it with Backtrack first (B4)`,
      );
    }
    return result;
  }

  // A1/C5: market approvals belong to the project's Regulatory / Project Manager people, the Lead and admins (SW-37), and launch approval is
  // hard-blocked until that market's PIF status is Approved — re-enforced here,
  // not trusted from the draft (ported from the store's setMarketTracksBulk).
  async setMarketTracks(
    user: SessionUser,
    id: string,
    tracks: ProjectData['marketTracks'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'market_tracks.updated', async (tx, row, project) => {
      if (!canChangeMarketTracksInProject(project, { displayName: user.displayName, isAdmin: this.permissions.isAdmin(user) })) {
        throw new ForbiddenException(MARKET_TRACKS_REASON);
      }
      let blocked = 0;
      // F4: a track is one market under one formula version.
      const versionIdOf = new Map(row.formulaVersions.map((v) => [v.version, v.id]));
      const currentVersion = row.formulaVersions.at(-1);
      for (const next of tracks) {
        const versionId = versionIdOf.get(next.formulaVersion) ?? currentVersion?.id;
        const prev = row.marketTracks.find((t) => t.market === next.market && t.formulaVersionId === versionId);
        if (!prev) continue;
        // Round 5 question 1(d): while a Critical change to the company lists is being reviewed, the market it holds cannot take a
        // new step towards sale — its launch approval, or the record that it is on sale. [ASSUMPTION: R6-Q6]
        if (heldMarkets(project).includes(next.market)) {
          const newApproval = next.launchApproval === 'Approved' && prev.launchApproval !== 'Approved';
          const newLaunch = !!next.actualLaunchDate && !prev.actualLaunchDate;
          if (newApproval || newLaunch) {
            throw new BadRequestException(
              `${next.market}: release is on hold pending an impact review of a Critical change to the company lists, so launch cannot be approved or recorded yet`,
            );
          }
        }
        let launchApproval = next.launchApproval;
        // C5 the other way round (SME rule audit B25, 2026-10-04): moving the PIF
        // off Approved while launch approval stands used to be kept as-is, because
        // the revert below restored the previous value — which was Approved. The
        // result was a launch approval resting on a PIF that is no longer approved.
        // Refused outright: change launch approval first. Whether a market already
        // on sale may reopen its PIF without revoking launch is not stated
        // [ASSUMPTION: R5-Q40].
        if (next.pifStatus !== 'Approved' && prev.launchApproval === 'Approved' && next.launchApproval === 'Approved') {
          throw new BadRequestException(
            `${next.market}: the PIF cannot leave Approved while launch approval stands — change the launch approval first (rule C5)`,
          );
        }
        if (launchApproval === 'Approved' && next.pifStatus !== 'Approved') {
          // C5 — keep the previous value rather than rejecting the whole save,
          // exactly as the store did.
          launchApproval = (prev.launchApproval as typeof launchApproval) ?? 'Not Started';
          blocked++;
        }
        // Round 4 question 14: an actual commercial launch date is the record that
        // a product IS on sale in this market, and every post-launch review
        // interval is measured from it. It cannot precede the approval to sell —
        // and unlike C5 above this is rejected outright rather than reverted,
        // because a date silently reverting is indistinguishable from a typo.
        const actualLaunch = next.actualLaunchDate?.trim();
        if (actualLaunch) {
          if (launchApproval !== 'Approved') {
            throw new BadRequestException(
              `${next.market}: an actual commercial launch date needs launch approval first (rule C5)`,
            );
          }
          const approvedOn = next.launchApprovedDate?.trim();
          if (approvedOn && actualLaunch < approvedOn) {
            throw new BadRequestException(
              `${next.market}: the actual launch date (${actualLaunch}) is before the launch approval date (${approvedOn})`,
            );
          }
        }
        const withdrawn = next.withdrawnDate?.trim();
        if (withdrawn && !next.withdrawnReason?.trim()) {
          throw new BadRequestException(`${next.market}: a reason is required to record a market withdrawal`);
        }
        // Round 5 question 5(b): launch approval of a Major replacement in a market IS the start of that market's transition for the older
        // version (Gate 11, not Gate 10). Nothing is written here for it any more: the market's state, and the version's, are derived from the
        // approval and the supersession decisions (utils/formulaLifecycle.ts), so they cannot disagree with them.
        await tx.marketTrack.update({
          where: { id: prev.id },
          data: {
            pifStatus: next.pifStatus,
            regulatoryStatus: next.regulatoryStatus,
            claimsApproval: next.claimsApproval,
            launchApproval,
            regulatoryNotes: next.regulatoryNotes ?? null,
            pifApprovedDate: this.dateOrNull(next.pifApprovedDate),
            launchApprovedDate: this.dateOrNull(next.launchApprovedDate),
            actualLaunchDate: this.dateOrNull(next.actualLaunchDate),
            withdrawnDate: this.dateOrNull(next.withdrawnDate),
            withdrawnReason: next.withdrawnReason ?? null,
          },
        });
      }
      return {
        tracks: tracks.length,
        launchBlockedByPif: blocked,
      };
    });
  }

  // Round 4 question 13 — recording what was done about a post-launch review
  // milestone. The SCHEDULE is derived from each market's actual launch date
  // (utils/postLaunch.ts) and is not stored; only the review itself is, keyed on
  // (market, milestone) so re-saving updates rather than duplicating.
  async setPostLaunchReviews(
    user: SessionUser,
    id: string,
    reviews: ProjectData['postLaunchReviews'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'post_launch_reviews.updated', async (tx, _row, project) => {
      const markets = new Set(project.identity.markets);
      for (const r of reviews) {
        if (!markets.has(r.market)) {
          throw new BadRequestException(`"${r.market}" is not a market on this project`);
        }
        // A completed review that says nothing is not a review. Question 13 gives
        // the schedule, not the content, so this asks only for the two things a
        // record of a completed review cannot be without.
        if (r.completedDate?.trim() && !r.outcome?.trim()) {
          throw new BadRequestException(`${r.market} ${r.milestone}: an outcome is required to complete a review`);
        }
        if (r.completedDate?.trim() && !r.reviewer?.trim()) {
          throw new BadRequestException(`${r.market} ${r.milestone}: a reviewer is required to complete a review`);
        }
        // Round 5 question 2(c): a Pending finding blocks "an unrestricted close-out of the affected review". Unrelated reviews (other
        // markets or milestones) are not held by it.
        if (r.completedDate?.trim()) {
          const holding = project.changeControlAssessments.filter(
            (a) => a.reviewCycle === `${r.market}|${r.milestone}` && isPendingAnswer(a),
          );
          if (holding.length > 0) {
            throw new BadRequestException(
              `${r.market} ${r.milestone}: cannot be closed while ${holding.map((a) => a.findingId || a.finding).join(', ')} is still pending its Change Control assessment`,
            );
          }
        }
        const data = {
          dueDate: new Date(r.dueDate),
          completedDate: this.dateOrNull(r.completedDate),
          reviewer: r.reviewer ?? null,
          outcome: r.outcome ?? null,
          evidenceLink: r.evidenceLink ?? null,
          notes: r.notes ?? null,
        };
        await tx.postLaunchReview.upsert({
          where: { projectId_market_milestone: { projectId: id, market: r.market, milestone: r.milestone } },
          create: { projectId: id, market: r.market, milestone: r.milestone, ...data },
          update: data,
        });
      }
      return { reviews: reviews.length };
    });
  }

  // Round 4 question 2 — the per-market supersession decision. "Must be recorded
  // by a person, never inferred automatically by the system", so this route is the
  // ONLY way a version reaches Superseded, and it refuses to record a confirmation
  // while any of the ten facts is missing.
  //
  // The version's own state is then derived and written here rather than by a
  // background rule: a version moves to Superseded exactly when every market it is
  // sold into has a complete decision, and that transition is a consequence of the
  // decisions, not a separate judgement.
  async setSupersessionDecision(
    user: SessionUser,
    id: string,
    input: ProjectData['supersessionDecisions'][number],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'supersession.updated', async (tx, row, project) => {
      this.supersessionTarget(row, project, input.version, input.market);
      // A decision the final approver has confirmed is the record a version was superseded on; it is closed to edits.
      const stored = project.supersessionDecisions.find((d) => d.version === input.version && d.market === input.market);
      if (stored?.confirmedBy) {
        throw new BadRequestException(
          `The supersession decision for ${input.market} was confirmed by ${stored.confirmedBy} and can no longer be changed`,
        );
      }
      const data = {
        replacementVersion: input.replacementVersion || null,
        effectiveTransitionDate: this.dateOrNull(input.effectiveTransitionDate),
        lastReleaseDate: this.dateOrNull(input.lastReleaseDate),
        stockDisposition: input.stockDisposition || null,
        regulatoryNotificationStatus: input.regulatoryNotificationStatus || null,
        artworkTransition: input.artworkTransition || null,
        pifUpdate: input.pifUpdate || null,
        salesMarketingCommunication: input.salesMarketingCommunication || null,
        distributorCommunication: input.distributorCommunication || null,
        noFurtherBatchesConfirmed: !!input.noFurtherBatchesConfirmed,
        notes: input.notes || null,
      };
      // A confirmation vouches for the value it was given on. Changing a fact withdraws ITS confirmation, and — because the market's
      // ten facts no longer stand as coordinated — Quality's coordination. Confirmations, like signatures, are never accepted from the
      // client: they are written only by the acts below (Round 5 question 5(a)).
      const previous = stored?.factConfirmations ?? {};
      const kept: Record<string, { by: string; at: string }> = {};
      let withdrawn = false;
      for (const fact of SUPERSESSION_FACTS) {
        const was = stored ? supersessionFactFilled(stored, fact) && String(stored[fact.key as keyof typeof stored] ?? '') : '';
        const now = supersessionFactFilled(input, fact) && String(input[fact.key as keyof typeof input] ?? '');
        if (previous[fact.key] && was === now) kept[fact.key] = previous[fact.key];
        else if (previous[fact.key]) withdrawn = true;
      }
      const keepCoordination = !withdrawn && !!stored?.coordinatedBy;
      const write = {
        ...data,
        factConfirmations: kept as unknown as Prisma.InputJsonValue,
        coordinatedBy: keepCoordination ? stored!.coordinatedBy : null,
        coordinatedAt: keepCoordination && stored!.coordinatedAt ? new Date(stored!.coordinatedAt) : null,
      };
      await tx.supersessionDecision.upsert({
        where: { projectId_version_market: { projectId: id, version: input.version, market: input.market } },
        create: { projectId: id, version: input.version, market: input.market, ...write },
        update: write,
      });
      return { version: input.version, market: input.market, confirmedFacts: Object.keys(kept).length, withdrawnConfirmations: withdrawn };
    });
  }

  // The version/market a supersession act is about: it must be on sale there and cannot be the current version.
  private supersessionTarget(row: { formulaVersions: { version: string }[] }, project: ProjectData, version: string, market: string): void {
    // F4: a supersession decision is owed where THIS version is on sale.
    if (!versionMarkets(project, version).includes(market)) {
      throw new BadRequestException(`Formula version ${version} is not on sale in "${market}"`);
    }
    if (!row.formulaVersions.some((v) => v.version === version)) throw new NotFoundException(`Formula version "${version}" not found`);
    if (version === project.formulaVersion) {
      throw new BadRequestException('The current formula version cannot be superseded — create a new version first');
    }
  }

  // Whoever the project's Lead assigned to one of these functions on THIS project holds it; an administrator account has no standing of
  // its own here (SW-57), exactly as for acknowledgements and impact assessments.
  private async assertHoldsFunction(tx: Prisma.TransactionClient, projectId: string, user: SessionUser, keys: readonly string[], doing: string): Promise<void> {
    const holders = await tx.projectReviewer.findMany({ where: { projectId, roleKey: { in: [...keys] } } });
    if (holders.length === 0) {
      throw new BadRequestException(
        `Nobody is assigned as ${functionsLabel(keys)} on this project yet, so nobody can ${doing} — the project's Lead assigns one in Project team`,
      );
    }
    if (!holders.some((h) => holdsRole(h, user))) {
      throw new ForbiddenException(`Only ${holders.map((h) => h.name).join(' or ')}, who holds ${functionsLabel(keys)} on this project, may ${doing}`);
    }
  }

  private storedSupersession(project: ProjectData, version: string, market: string): ProjectData['supersessionDecisions'][number] {
    const stored = project.supersessionDecisions.find((d) => d.version === version && d.market === market);
    if (!stored) throw new BadRequestException(`Nothing is recorded for ${version} in ${market} yet — save the facts first`);
    if (stored.confirmedBy) {
      throw new BadRequestException(`The supersession decision for ${market} was confirmed by ${stored.confirmedBy} and can no longer be changed`);
    }
    return stored;
  }

  // Round 5 question 5(a): "each fact is confirmed by its accountable function". The holder of one of the functions the fact belongs to
  // confirms it, as themselves; the value must already be on record.
  async confirmSupersessionFact(
    user: SessionUser,
    id: string,
    input: { version: string; market: string; factKey: string },
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'supersession.fact_confirmed', async (tx, row, project) => {
      this.supersessionTarget(row, project, input.version, input.market);
      const fact = SUPERSESSION_FACTS.find((f) => f.key === input.factKey);
      if (!fact) throw new BadRequestException(`"${input.factKey}" is not one of the ten supersession facts`);
      const stored = this.storedSupersession(project, input.version, input.market);
      if (isLegacyConfirmed(stored)) throw new BadRequestException('This decision was confirmed before facts were confirmed one by one, and stands as it is');
      if (!supersessionFactFilled(stored, fact)) {
        throw new BadRequestException(`"${fact.label}" has no value on record yet — save it before it is confirmed`);
      }
      if (stored.factConfirmations?.[fact.key]) throw new BadRequestException(`"${fact.label}" is already confirmed`);
      await this.assertHoldsFunction(tx, id, user, fact.functions, `confirm "${fact.label}"`);
      const confirmations = { ...(stored.factConfirmations ?? {}), [fact.key]: { by: user.displayName, at: new Date().toISOString() } };
      await tx.supersessionDecision.update({
        where: { projectId_version_market: { projectId: id, version: input.version, market: input.market } },
        data: { factConfirmations: confirmations as unknown as Prisma.InputJsonValue },
      });
      return { version: input.version, market: input.market, factKey: fact.key, confirmedBy: user.displayName };
    });
  }

  // "Quality coordinates final per-market supersession": once the ten facts stand, the holder of Quality marks the market as coordinated.
  async coordinateSupersession(
    user: SessionUser,
    id: string,
    input: { version: string; market: string },
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'supersession.coordinated', async (tx, row, project) => {
      this.supersessionTarget(row, project, input.version, input.market);
      const stored = this.storedSupersession(project, input.version, input.market);
      if (isLegacyConfirmed(stored)) throw new BadRequestException('This decision was confirmed before coordination existed, and stands as it is');
      if (!allFactsConfirmed(stored)) {
        const gaps = supersessionGaps(stored).filter((g) => !g.startsWith('Coordination') && !g.startsWith('Confirmation of the completed'));
        throw new BadRequestException(listMessage('Not every fact is confirmed yet:', gaps));
      }
      await this.assertHoldsFunction(tx, id, user, [SUPERSESSION_COORDINATOR], `coordinate the supersession in ${input.market}`);
      await tx.supersessionDecision.update({
        where: { projectId_version_market: { projectId: id, version: input.version, market: input.market } },
        data: { coordinatedBy: user.displayName, coordinatedAt: new Date() },
      });
      return { version: input.version, market: input.market, coordinatedBy: user.displayName };
    });
  }

  // "The authorised final approver confirms the completed transition": the last act. It makes the market Superseded (nothing derives it
  // before), and from then on the decision is closed.
  async approveSupersession(
    user: SessionUser,
    id: string,
    input: { version: string; market: string },
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'supersession.approved', async (tx, row, project) => {
      this.supersessionTarget(row, project, input.version, input.market);
      const stored = this.storedSupersession(project, input.version, input.market);
      if (isLegacyConfirmed(stored)) throw new BadRequestException('This decision was already confirmed');
      if (!stored.coordinatedBy) {
        throw new BadRequestException(listMessage('The supersession is not complete yet:', supersessionGaps(stored)));
      }
      if (!(await this.holdsAnyCapability(user, [SUPERSESSION_FINAL_CAPABILITY]))) {
        throw new ForbiddenException(`Only the authorised final approver confirms a completed transition (needs ${SUPERSESSION_FINAL_CAPABILITY})`);
      }
      const now = new Date();
      await tx.supersessionDecision.update({
        where: { projectId_version_market: { projectId: id, version: input.version, market: input.market } },
        data: { finalApprovedBy: user.displayName, finalApprovedAt: now, confirmedBy: user.displayName, confirmedAt: now },
      });
      return { version: input.version, market: input.market, approvedBy: user.displayName };
    });
  }

  // C2: the Independent Reviewer must not share the Study Author's department.
  // Rejected outright (the whole point is that the combination is invalid).
  async setStudyApprovals(
    user: SessionUser,
    id: string,
    approvals: ProjectData['studyApprovals'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'study_approvals.updated', async (tx, row, project) => {
      // C9: the study approval trail sits on the Study Protocol register, so it
      // follows that register's gate lock.
      if (isGateRefLocked(project, getRegisterConfig('studyProtocolSetup')?.gate)) {
        throw new ForbiddenException('The study approval trail belongs to gate 08, which has passed — it is read-only (use Backtrack)');
      }
      // C5 (SME rule audit, 2026-10-04): the department C2 compares used to be
      // whatever the browser sent, and the check was skipped when either was blank
      // — so independence could be satisfied by typing a different department, or
      // by typing none. The department is now each named person's SSO department,
      // and a named person must be a real account with one.
      const resolved: ProjectData['studyApprovals'] = [];
      for (const a of approvals) {
        const name = a.name?.trim();
        if (!name) {
          resolved.push({ ...a, department: undefined });
          continue;
        }
        const person = await tx.user.findFirst({
          where: { displayName: { equals: name, mode: 'insensitive' }, active: true },
          include: { department: true },
        });
        if (!person) throw new BadRequestException(`${a.role}: "${name}" is not an active user`);
        resolved.push({ ...a, department: person.department?.name ?? undefined });
      }
      approvals = resolved;
      const author = approvals.find((a) => a.role === 'Study Author');
      const independent = approvals.find((a) => a.role === 'Independent Reviewer');
      if (author?.name?.trim() && independent?.name?.trim() && (!author.department || !independent.department)) {
        throw new BadRequestException(
          `Independence cannot be checked: ${!author.department ? author.name : independent.name} has no department on their account (rule C2)`,
        );
      }
      if (
        author?.department?.trim() &&
        independent?.department?.trim() &&
        author.department.trim().toLowerCase() === independent.department.trim().toLowerCase()
      ) {
        throw new BadRequestException(
          'The Independent Reviewer must not belong to the same department as the Study Author (rule C2)',
        );
      }
      for (const a of approvals) {
        const target = row.studyApprovals.find((s) => s.role === a.role);
        if (!target) continue;
        await tx.studyApproval.update({
          where: { id: target.id },
          data: {
            name: a.name ?? null,
            department: a.department ?? null,
            date: this.dateOrNull(a.date),
            decision: a.decision ?? null,
            comments: a.comments ?? null,
          },
        });
      }
      return { approvals: approvals.length };
    });
  }

  // --- Phase 6: CAPA / feedback / change control ---

  async setCapa(
    user: SessionUser,
    id: string,
    records: ProjectData['capa'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    for (const c of records) assertOneOf(`${c.id}: status`, c.status, CAPA_STATUSES);
    return this.mutate(user, id, expectedVersion, 'capa.updated', async (tx) => {
      // `code` is globally unique, so deletes are scoped to this project and the
      // rows are recreated from the submitted list.
      await tx.capaRecord.deleteMany({ where: { projectId: id } });
      if (records.length > 0) {
        await tx.capaRecord.createMany({
          data: records.map((c) => ({
            projectId: id,
            code: c.id,
            market: c.market,
            eventType: c.eventType,
            summary: c.summary,
            severity: c.severity,
            status: c.status,
            owner: c.owner,
            notes: c.notes ?? null,
            productSku: c.productSku ?? null,
            investigationLink: c.investigationLink ?? null,
            capaLink: c.capaLink ?? null,
            pifPmfImpact: c.pifPmfImpact ?? null,
          })),
        });
      }
      return { records: records.length };
    });
  }

  async setFeedback(
    user: SessionUser,
    id: string,
    entries: ProjectData['feedback'],
    samples: ProjectData['feedbackSamples'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const sampleIds = new Set<string>();
    for (const s of samples) {
      if (!/^[0-9a-f-]{36}$/i.test(String(s.id))) throw new BadRequestException('A sample id must be a UUID');
      if (sampleIds.has(s.id)) throw new BadRequestException('Two samples share one id');
      sampleIds.add(s.id);
    }
    for (const f of entries) {
      if (!sampleIds.has(f.sampleId)) throw new BadRequestException(`${f.id}: the entry names a sample that is not on this project`);
      assertOneOf(`${f.id}: too oily / slippery`, f.tooOilySlippery, FEEDBACK_TOO_OILY_OPTIONS);
      assertOneOf(`${f.id}: would recommend`, f.wouldRecommend, FEEDBACK_RECOMMEND_OPTIONS);
    }
    return this.mutate(user, id, expectedVersion, 'feedback.updated', async (tx) => {
      // A sample can only be removed once nothing points at it: its feedback is deleted first, in an earlier save (project owner,
      // 2026-10-27), so a sample is never dropped together with scores somebody recorded against it.
      const held = await tx.feedbackEntry.groupBy({ by: ['sampleId'], where: { projectId: id, sampleId: { not: null } }, _count: { _all: true } });
      const heldBy = new Map(held.map((h) => [h.sampleId as string, h._count._all]));
      const stored = await tx.feedbackSample.findMany({ where: { projectId: id }, select: { id: true } });
      for (const old of stored) {
        const count = heldBy.get(old.id) ?? 0;
        if (!sampleIds.has(old.id) && count > 0) {
          throw new BadRequestException(`A sample with feedback cannot be deleted: delete its ${count} feedback ${count === 1 ? 'entry' : 'entries'} first`);
        }
      }
      // Entries go first, then samples; both are rewritten from the lists above.
      await tx.feedbackEntry.deleteMany({ where: { projectId: id } });
      await tx.feedbackSample.deleteMany({ where: { projectId: id } });
      if (samples.length > 0) {
        await tx.feedbackSample.createMany({
          data: samples.map((s, i) => ({
            id: s.id,
            projectId: id,
            sampleOrder: i,
            productSku: s.productSku || null,
            productFamily: s.productFamily || null,
            developmentStage: s.developmentStage || null,
            linkedChangeId: s.linkedChangeId || null,
            sampleBatchCode: s.sampleBatchCode || null,
            formulaVersion: s.formulaVersion || null,
            dateIssued: s.dateIssued ? new Date(s.dateIssued) : null,
            panelCoordinator: s.panelCoordinator || null,
          })),
        });
      }
      if (entries.length > 0) {
        await tx.feedbackEntry.createMany({
          data: entries.map((f) => ({
            projectId: id,
            sampleId: f.sampleId,
            testerName: f.testerName,
            gender: f.gender,
            dept: f.dept,
            dateTested: new Date(f.dateTested),
            texture: f.texture,
            fragrance: f.fragrance,
            overall: f.overall,
            tooOilySlippery: f.tooOilySlippery,
            wouldRecommend: f.wouldRecommend,
            followUpAction: f.followUpAction ?? null,
            bestLiked: f.bestLiked ?? null,
            concerns: f.concerns ?? null,
          })),
        });
      }
      return { entries: entries.length, samples: samples.length };
    });
  }

  // A2: a new formula version is recorded in the version history and the
  // Formulation Change Register. A MAJOR change also reopens Gates 4-9 and
  // invalidates the sign-offs of every phase with a gate in that range, with the
  // pre-change state preserved in a BacktrackEvent (B4 — nothing is deleted).
  // Ported from the store's createFormulaVersion; the reopen/invalidate half is
  // deliberately the same shape as `backtrack` above, because it IS a backtrack.
  async createFormulaVersion(
    user: SessionUser,
    id: string,
    input: {
      version: string;
      changeType: 'Major' | 'Minor';
      reason?: string;
      initiatedBy?: string;
      majorCriteria?: string[];
      classificationConfirmedBy?: string;
      // Round 5 question 5(c): the manufactured formula is unchanged — a document revision.
      documentationOnly?: boolean;
      // Round 5 question 5(d): a person confirms the version this one replaces was never released.
      confirmNoRelease?: boolean;
    },
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<ProjectEnvelope> {
    const scope = 'project.formula_version';
    const replayed = await this.idempotency.replay(scope, idempotencyKey);
    if (replayed) return replayed as ProjectEnvelope;

    const version = input.version.trim();
    if (!version) throw new BadRequestException('A formula version is required');
    // F5 (SME rule audit C1, 2026-10-04): "the change initiator may propose the
    // classification, but an authorised technical or quality reviewer must
    // confirm it." The confirmer used to be a typed name and nothing checked who
    // created a version at all. Now the person creating it is the confirmer, and
    // must hold Technical or Quality authority. Whether the initiator and the
    // confirmer may be the same person is ours to ask [ASSUMPTION: R5-Q42].
    if (!(await this.holdsAnyCapability(user, [...FORMULA_CLASSIFICATION_CAPABILITIES]))) {
      throw new ForbiddenException(
        'Creating a formula version confirms its Major/Minor classification, which needs Technical or Quality authority (F5)',
      );
    }
    // Any ticked impact area makes it Major — the modal enforced this, the API did not.
    const majorCriteria = (input.majorCriteria ?? []).filter((c) => MAJOR_CHANGE_CRITERIA.some((m) => m.id === c));
    if (majorCriteria.length !== (input.majorCriteria ?? []).length) {
      throw new BadRequestException('Unknown change-impact criterion');
    }
    if (majorCriteria.length > 0 && input.changeType !== 'Major') {
      throw new BadRequestException('A change that touches any impact area is Major (F5)');
    }
    // A documentation-only correction leaves the manufactured formula as it was, so it is never a Major change, and it must say what was
    // corrected (the reason is what the document revision records).
    if (input.documentationOnly && (input.changeType !== 'Minor' || !input.reason?.trim())) {
      throw new BadRequestException('A documentation-only correction is a Minor change and needs its reason');
    }

    const envelope = await this.mutate(
      user,
      id,
      expectedVersion,
      'formula_version.created',
      async (tx, row, project) => {
        // Only while Gate 05 is the gate open for work (project owner's decision).
        if (currentGateIndex(project) !== gateIndex('SG05')) {
          throw new BadRequestException('A new formula version can be created only while Gate 05 is the open gate');
        }
        if (version === project.formulaVersion) {
          throw new BadRequestException(`Project is already on formula version ${version}`);
        }
        const previous = row.formulaVersions.at(-1);

        // The old version KEEPS its BOM lines, which is what makes the version-compare feature work without a snapshot column.
        //
        // Round 4 question 2: "an older formula version does not automatically close when the replacement receives launch approval". Round 5
        // question 5 (answered 2026-11-05) says how it does, market by market: Superseded is reached only through a market's supersession
        // decision (confirmed fact by fact by the accountable functions, coordinated by Quality, confirmed by the final approver), and a
        // version's state is DERIVED from its markets' (utils/formulaLifecycle.ts), so nothing is written for it here. [ASSUMPTION: R5-Q53]
        // (answered; the tag stays because the sweep wants every defined question referenced).
        const previousOnSale = previous
          ? row.marketTracks.some(
              (t) => t.formulaVersionId === previous.id && t.actualLaunchDate !== null && t.withdrawnDate === null,
            )
          : false;
        // Round 5 question 5: nothing starts a transition here. A MAJOR version leaves the old one Active until the replacement is approved for
        // release in a market (Gate 11); a MINOR one starts no transition by itself either ("no automatic immediate transition"): it needs its
        // approved effective date and the actual stock and release facts, recorded in the market's supersession decision. A documentation-only
        // correction is a document revision and needs no stock transition, so the version it revises is superseded at once. A version that was
        // NEVER released is superseded straight away too, but only once a person has confirmed there was no release — the replacement and
        // the reason are this version and its reason, and the trial and study history stays with the old version's record.
        if (previous) {
          if (input.documentationOnly) {
            await tx.formulaVersion.update({ where: { id: previous.id }, data: { status: 'Superseded' } });
          } else if (!previousOnSale) {
            if (!input.confirmNoRelease) {
              throw new BadRequestException(
                `Formula ${previous.version} was never released to any market. Confirm that there was no release to supersede it with ${version}.`,
              );
            }
            await tx.formulaVersion.update({
              where: { id: previous.id },
              data: { status: 'Superseded', noReleaseConfirmedBy: user.displayName },
            });
          }
        }
        const created = await tx.formulaVersion.create({
          data: {
            projectId: id,
            version,
            previousVersionId: previous?.id,
            changeType: input.changeType,
            reason: input.reason ?? null,
            // C8/C1: who did it comes from the session, never from the request.
            initiatedBy: user.displayName,
            majorCriteria,
            classificationConfirmedBy: user.displayName,
            documentationOnly: !!input.documentationOnly,
            status: 'Active',
          },
        });
        // Carry the current composition forward so the new version starts from
        // the old one rather than empty.
        const carried = previous?.bomLines ?? [];
        if (carried.length > 0) {
          await tx.bomLine.createMany({
            data: carried.map((l) => ({
              formulaVersionId: created.id,
              line: l.line,
              rmCode: l.rmCode,
              inciName: l.inciName,
              casNo: l.casNo,
              functionRole: l.functionRole,
              supplier: l.supplier,
              percentWw: l.percentWw,
              costPerKg: l.costPerKg,
              evidenceLink: l.evidenceLink,
              methodRef: l.methodRef,
              notes: l.notes,
              fromCosmetri: l.fromCosmetri,
              reconciled: l.reconciled,
              rmDisplayName: l.rmDisplayName,
            })),
          });
        }
        // F4 (SME rule audit D, 2026-10-05): "launched per-market Gate 10-12 tracks
        // are preserved for the old formula version; a major change creates a new
        // per-market Gate 10-12 track for the new version". Every market the
        // previous version was being pursued in (not withdrawn) gets a fresh track
        // for the new version; the old tracks stay as they are. A MINOR change does
        // not reopen any gate, so the current tracks carry over to the new version.
        if (previous) {
          const previousTracks = row.marketTracks.filter((t) => t.formulaVersionId === previous.id);
          if (input.changeType === 'Major') {
            const markets = previousTracks.filter((t) => t.withdrawnDate === null).map((t) => t.market);
            if (markets.length > 0) {
              await tx.marketTrack.createMany({
                data: markets.map((market) => ({ projectId: id, market, formulaVersionId: created.id })),
              });
            }
          } else if (previousTracks.length > 0) {
            await tx.marketTrack.updateMany({
              where: { id: { in: previousTracks.map((t) => t.id) } },
              data: { formulaVersionId: created.id },
            });
          }
        }

        let reopened: string[] = [];
        // B5: the gate signatures this version invalidated, kept on the audit row.
        let clearedGateSignOffs: Prisma.JsonObject[] = [];
        if (input.changeType === 'Major') {
          // F4: the new version gets new Gate 10-12 tracks, so its project-level
          // Gate 10-12 records reopen too — A2 named Gates 4-9 before F4 existed, and the
          // project rows are the roll-up of the new version's tracks (SW-53). The old version's per-market lanes are kept: they
          // belong to that version (see clearGateSignOffs).
          const toIdx = gateIndex('SG04');
          const fromIdx = gateIndex('SG12');
          const affected = project.gates.filter((g) => {
            const idx = gateIndex(g.gateId);
            return idx >= toIdx && idx <= fromIdx;
          });
          reopened = affected.map((g) => g.gateId);

          const affectedPhases = new Set(reopened.map((gid) => GATES.find((m) => m.id === gid)!.phase));
          const previousSignOffs: Record<number, SignOff[]> = {};
          for (const phase of affectedPhases) {
            const closure = row.phaseClosures.find((c) => c.phase === phase);
            if (!closure) continue;
            previousSignOffs[phase] = closure.signOffs.map((so) => ({
              role: so.role as SignOff['role'],
              assignedToUserId: so.assignedToUserId ?? undefined,
              name: so.name ?? undefined,
              initials: so.initials ?? undefined,
              date: so.date ? so.date.toISOString().slice(0, 10) : undefined,
              decision: (so.decision ?? undefined) as SignOff['decision'],
              comments: so.comments ?? undefined,
              // The whole point of the snapshot is that an invalidated
              // signature stays readable — so it must carry the fields that
              // make it a signature, not just the typed columns.
              signedByUserId: so.signedByUserId ?? undefined,
              signedAt: so.signedAt ? so.signedAt.toISOString() : undefined,
              roleAtSigning: so.roleAtSigning ?? undefined,
              recordVersion: so.recordVersion ?? undefined,
            }));
            await tx.signOff.updateMany({
              where: { phaseClosureId: closure.id },
              // The nominated signers (assignedToUserId) survive — they must
              // re-sign the reopened phase, not be re-nominated from scratch.
              data: {
                name: null,
                initials: null,
                date: null,
                decision: null,
                comments: null,
                signedByUserId: null,
                signedAt: null,
                roleAtSigning: null,
                recordVersion: null,
              },
            });
          }

          await tx.backtrackEvent.create({
            data: {
              projectId: id,
              initiatedBy: user.displayName,
              reason: `Formula version ${project.formulaVersion} -> ${version} (Major)${input.reason ? ` — ${input.reason}` : ''}`,
              fromGateId: 'SG12',
              toGateId: 'SG04',
              reopenedGateIds: reopened,
              previousGates: affected.map((g) => ({ ...g })) as unknown as Prisma.InputJsonValue,
              previousSignOffs: previousSignOffs as unknown as Prisma.InputJsonValue,
            },
          });
          await tx.gateRecord.updateMany({
            where: { projectId: id, gateId: { in: reopened } },
            data: { status: 'Not Started', decision: null },
          });
          clearedGateSignOffs = await this.clearGateSignOffs(tx, id, reopened);
          await this.clearPreWorkAcceptance(tx, id, GATES[toIdx].phase);

          // Register closing (2026-08-27) — same reopen-in-lockstep fix as
          // backtrack() above, needed here too since this is the same
          // "reopen a gate range" cascade, just triggered by a Major formula
          // version instead of a manual Backtrack.
          const reopenedRegisterKeys = REGISTER_CONFIGS.filter((config) => {
            const thresholdId = gateRefHighestGateId(config.gate);
            return thresholdId && toIdx <= gateIndex(thresholdId) && gateIndex(thresholdId) <= fromIdx;
          }).map((config) => config.key);
          if (reopenedRegisterKeys.length > 0) {
            await tx.registerClosureSignOff.updateMany({
              where: { closure: { projectId: id, registerKey: { in: reopenedRegisterKeys } } },
              data: {
                name: null,
                signedByUserId: null,
                signedAt: null,
                roleAtSigning: null,
                recordVersion: null,
                signatureImage: null,
                signatureVerifiedAt: null,
                contentHash: null,
              },
            });
          }
        }

        // Nothing here requires a Change Control record, and a record opened before or after is not
        // consulted: whether the record must come first, and whether its approval is what permits a new
        // version, is [ASSUMPTION: R5-Q66]. The Gate 05 condition at the top is the project owner's.
        //
        // Formulation Change Register entry (A2).
        //
        // This writes an `FC-xxx` row into a SECOND change log, parallel to the
        // `CHG-xxx` Change Control log and unlinked to it. The Major cascade just
        // above is real — SG04-SG09 reopen and their phase sign-offs are cancelled
        // — but no `CHG-` record exists, so the change-control machinery is blind
        // to it: no soft lock at Gates 10/11 (outside the reopened range), no Gate
        // 11 impact evaluation (E3(b) requires one per open change), closure by one
        // `Closed?` tick rather than q34(c) eight-field disposition, and no
        // `impactAreas` to mark it launch-impacting. Whether these are one book or two is
        // [ASSUMPTION: R5-Q19]; deliberately not "fixed" before the review team
        // answers, because merging two records that are genuinely different is
        // worse than leaving them apart.
        const existing = await tx.registerRow.findMany({
          where: { projectId: id, registerKey: 'formulationChangeRegister' },
          select: { data: true },
        });
        const existingRows = existing.length;
        // Highest existing FC number + 1, not the row count: rows on this
        // register can be removed, and a count would then reissue an id that is
        // already printed on another record.
        const nextFc =
          existing.reduce((max, r) => {
            const raw = (r.data as Record<string, unknown> | null)?.changeId;
            const n = typeof raw === 'string' ? /^FC-(\d+)$/.exec(raw)?.[1] : undefined;
            return n ? Math.max(max, Number(n)) : max;
          }, 0) + 1;
        await tx.registerRow.create({
          data: {
            projectId: id,
            registerKey: 'formulationChangeRegister',
            rowOrder: existingRows,
            updatedById: user.id,
            data: {
              changeId: `FC-${String(nextFc).padStart(3, '0')}`,
              productFamilySku: project.identity.productSku,
              requestedByNpd: user.displayName,
              dateRequested: new Date().toISOString().slice(0, 10),
              changeTitle: `Formula version ${project.formulaVersion} -> ${version} (${input.changeType})`,
              explanation: input.reason ?? '',
              vnRegistrationRequired:
                input.changeType === 'Major' && project.identity.markets.includes('Vietnam') ? 'Yes' : 'No',
              approvedByNp: NP_APPROVAL_PENDING,
              overallStatus: 'In Progress',
            } as Prisma.InputJsonValue,
          },
        });

        return { version, changeType: input.changeType, reopenedGateIds: reopened, clearedGateSignOffs };
      },
    );

    await this.prisma.$transaction((tx) =>
      this.idempotency.remember(tx, scope, idempotencyKey, 201, envelope as unknown as Prisma.InputJsonValue),
    );
    return envelope;
  }

  // Change Control is project-scoped in the database even though the store kept
  // it as one global list; the UI filters by projectId either way.
  async setChanges(
    user: SessionUser,
    id: string,
    records: ChangeRecord[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    // The risk level decides whether an open change hard-blocks Gate 11, so a
    // value off the shared scale (a typo, a lower-case 'critical') must not reach
    // the rule engine, which compares exact values.
    for (const c of records) {
      for (const area of c.impactAreas ?? []) assertOneOf(`${c.changeId}: impact area`, area, CHANGE_IMPACT_AREAS);
      // The workbook's Affected area list; blank stays legal (a record from before the list existed).
      if ((c.affectedArea ?? '') !== '') assertOneOf(`${c.changeId}: affected area`, c.affectedArea, CHANGE_AFFECTED_AREAS);
    }
    const badRisk = records.find((c) => !(RISK_LEVELS as readonly string[]).includes(c.riskLevel));
    if (badRisk) {
      throw new BadRequestException(
        `${badRisk.changeId}: risk level "${badRisk.riskLevel}" is not one of ${RISK_LEVELS.join(' / ')}`,
      );
    }
    return this.mutate(user, id, expectedVersion, 'changes.updated', async (tx, _row, project) => {
      // C2 (SME rule audit, 2026-10-04). The list was replaced wholesale, so any
      // save could drop a change record — including an open one that was holding
      // a gate (F9) — and the audit said only how many rows there were. Now only a
      // Draft, which was never submitted, may be discarded; anything further along
      // ends in a closing status, so its history stays (B4). And the audit names
      // what changed, record by record.
      const before = new Map(project.changes.map((c) => [c.changeId, c]));
      const incomingIds = new Set(records.map((c) => c.changeId));
      const removed = project.changes.filter((c) => !incomingIds.has(c.changeId));
      const notDraft = removed.filter((c) => c.status !== 'Draft');
      if (notDraft.length > 0) {
        throw new BadRequestException(
          `${notDraft.map((c) => c.changeId).join(', ')} cannot be deleted — only a Draft can. Close it with Rejected, Cancelled or Superseded instead, so its history stays`,
        );
      }
      // A change id is the record's reference everywhere and is unique across ALL projects: refuse a repeat with a
      // message instead of letting the database answer 500 (SW-55).
      const seenIds = new Set<string>();
      for (const c of records) {
        if (seenIds.has(c.changeId)) throw new BadRequestException(`${c.changeId}: this change id appears twice in the list`);
        seenIds.add(c.changeId);
      }
      const usedElsewhere = await tx.changeRecord.findMany({
        where: { changeId: { in: [...seenIds] }, OR: [{ projectId: null }, { projectId: { not: id } }] },
        select: { changeId: true },
      });
      if (usedElsewhere.length > 0) {
        throw new BadRequestException(`${usedElsewhere.map((c) => c.changeId).join(', ')}: this change id is already used by another project`);
      }

      // SW-55. A change may only be CLOSED once its final disposition is recorded (Round 4 question 34(c)), so a
      // saved change is never "closed but incomplete"; and once closed it is frozen — only Reopen (with a reason)
      // changes it. A record that was already closed and incomplete before this rule stays editable, so it can
      // still be completed.
      const isClosed = (status: string) => (CHANGE_CLOSED_STATUSES as string[]).includes(status);
      const norm = (v: unknown) => (Array.isArray(v) && v.length === 0 ? null : (v ?? null));
      for (const c of records) {
        const old = before.get(c.changeId);
        if (old && isClosed(old.status) && isChangeDispositionRecorded(old)) {
          const changedFields = (Object.keys({ ...old, ...c }) as (keyof ChangeRecord)[]).filter(
            (k) => k !== 'projectId' && !TRIAGE_SERVER_FIELDS.includes(k) && JSON.stringify(norm(old[k])) !== JSON.stringify(norm(c[k])),
          );
          if (changedFields.length > 0) {
            throw new BadRequestException(
              `${c.changeId} is closed (${old.status}) and its record is frozen — reopen it first (changed: ${changedFields.join(', ')})`,
            );
          }
        } else if (isClosed(c.status) && !isChangeDispositionRecorded(c) && !(old && isClosed(old.status))) {
          throw new BadRequestException(
            `${c.changeId} cannot be closed as ${c.status} until its final disposition is recorded — missing: ${missingDispositionFields(c).join(', ')}`,
          );
        }
      }

      // Round 5 question 10: "approval to implement" is one of the two moments the affected decisions are reopened, so a change cannot be
      // approved or implemented before its impact has been assessed. Checked only on the move INTO such a status, so a record that was
      // already there before this rule stays editable. [ASSUMPTION: R6-Q16]
      for (const c of records) {
        const old = before.get(c.changeId);
        const triaged = !!old && isTriageRecorded(old);
        if (CHANGE_STATUSES_NEEDING_TRIAGE.includes(c.status) && old?.status !== c.status && !triaged) {
          throw new BadRequestException(
            `${c.changeId}: its impact has not been assessed yet, so it cannot be "${c.status}" — Quality's change-control reviewer records the impact triage first`,
          );
        }
      }

      // SW-54: a change names only markets the project sells into; one already on the stored record stays
      // valid even if the project has since dropped it, so an old record can still be saved.
      for (const c of records) {
        const kept = new Set(before.get(c.changeId)?.markets ?? []);
        const unknown = (c.markets ?? []).filter((m) => !project.identity.markets.includes(m) && !kept.has(m));
        if (unknown.length > 0) {
          throw new BadRequestException(`${c.changeId}: "${unknown.join(', ')}" is not one of this project's markets`);
        }
      }
      const edited: { changeId: string; fields: string[] }[] = [];
      const added: string[] = [];
      for (const c of records) {
        const old = before.get(c.changeId);
        if (!old) {
          // SW-30: a new change is only accepted once its trigger's earliest gate has passed.
          // Only NEW records are checked — editing one that already exists must stay possible.
          const trig = c.triggerId ? getChangeTrigger(c.triggerId) : undefined;
          const availability = trig ? changeTriggerAvailability(project, trig) : undefined;
          if (availability && !availability.allowed) {
            throw new BadRequestException(`${c.changeId}: "${trig!.label}" cannot be opened yet — ${availability.reason}`);
          }
          added.push(c.changeId);
          continue;
        }
        const fields = (Object.keys({ ...old, ...c }) as (keyof ChangeRecord)[]).filter(
          (k) => k !== 'projectId' && !TRIAGE_SERVER_FIELDS.includes(k) && JSON.stringify(old[k] ?? null) !== JSON.stringify(c[k] ?? null),
        );
        if (fields.length > 0) edited.push({ changeId: c.changeId, fields });
      }
      await tx.changeRecord.deleteMany({ where: { projectId: id } });
      if (records.length > 0) {
        await tx.changeRecord.createMany({
          data: records.map((c) => ({
            projectId: id,
            changeId: c.changeId,
            triggerId: c.triggerId ?? null,
            trigger: c.trigger,
            productSku: c.productSku,
            affectedArea: c.affectedArea,
            oldVersion: c.oldVersion ?? null,
            riskLevel: c.riskLevel,
            // E3(b): Gate 11 evaluates this, so it must round-trip.
            impactAreas: c.impactAreas ?? [],
            markets: c.markets ?? [],
            requiredAction: c.requiredAction ?? null,
            evidenceLink: c.evidenceLink ?? null,
            requiredSignOffs: c.requiredSignOffs ?? null,
            communicationRequired: c.communicationRequired,
            salesMarketingMessage: c.salesMarketingMessage ?? null,
            dueDate: this.dateOrNull(c.dueDate),
            status: c.status,
            closureEvidence: c.closureEvidence ?? null,
            closedDate: this.dateOrNull(c.closedDate),
            // Round 4 question 34(c) — the other five parts of a final disposition.
            closureOutcome: c.closureOutcome ?? null,
            closureImplementation: c.closureImplementation ?? null,
            closureImpactedVersions: c.closureImpactedVersions ?? null,
            closureVerifier: c.closureVerifier ?? null,
            closureRemainingAction: c.closureRemainingAction ?? null,
            // Round 5 question 10: the triage is the server's own act (triageChange), so whatever the client sent for these five is
            // discarded and the stored values are kept.
            impactTriage: before.get(c.changeId)?.impactTriage ?? null,
            triageReason: before.get(c.changeId)?.triageReason ?? null,
            triageBy: before.get(c.changeId)?.triageBy ?? null,
            triageDate: this.dateOrNull(before.get(c.changeId)?.triageDate),
            confirmedGates: before.get(c.changeId)?.confirmedGates ?? [],
            restoreConfirmation: c.restoreConfirmation ?? null,
            owner: c.owner,
            notes: c.notes ?? null,
          })),
        });
      }
      return {
        records: records.length,
        added,
        removed: removed.map((c) => c.changeId),
        edited,
      } as unknown as Prisma.InputJsonValue;
    });
  }

  // SW-55. A closed change is frozen; this is the one way back. It needs a reason, is audited with it, keeps every
  // field already recorded, and is refused when it would make a gate that has passed stop counting as passed —
  // that takes a Backtrack, as for any other record (B4).
  async reopenChange(
    user: SessionUser,
    id: string,
    changeId: string,
    reason: string | undefined,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const why = (reason ?? '').trim();
    if (!why) throw new BadRequestException('A reason is required to reopen a closed change');
    return this.mutate(user, id, expectedVersion, 'change.reopened', async (tx, _row, project) => {
      const c = project.changes.find((x) => x.changeId === changeId);
      if (!c) throw new BadRequestException(`${changeId} is not a change of this project`);
      if (!(CHANGE_CLOSED_STATUSES as string[]).includes(c.status)) {
        throw new BadRequestException(`${changeId} is not closed (${c.status})`);
      }
      const allowed =
        this.permissions.isAdmin(user) || project.identity.projectLead === user.displayName || c.owner === user.displayName;
      if (!allowed) {
        throw new ForbiddenException(`Only the project Lead, the change's owner or an administrator may reopen ${changeId}`);
      }
      const after: ProjectData = {
        ...project,
        changes: project.changes.map((x) => (x.changeId === changeId ? { ...x, status: 'Under Review' } : x)),
      };
      const flipped = project.gates
        .filter((g) => isGatePassed(project, g.gateId) && !isGatePassed(after, g.gateId))
        .map((g) => g.gateId);
      if (flipped.length > 0) {
        throw new BadRequestException(
          `Reopening ${changeId} would un-pass ${flipped.join(', ')}, which has already passed — reopen it with Backtrack first (B4)`,
        );
      }
      await tx.changeRecord.update({ where: { changeId }, data: { status: 'Under Review' } });
      return { changeId, from: c.status, to: 'Under Review', reason: why } as unknown as Prisma.InputJsonValue;
    });
  }

  // Round 5 question 10: the controlled impact assessment of a change. Quality's change-control reviewer records whether the change is
  // material, and the full scope of gates it invalidates (the trigger only suggests a minimum). A Material outcome reopens every confirmed
  // gate that stands passed — all of them, not only the earliest — as one recorded event that keeps the earlier decisions, reason, CHG id
  // and owner of the act; the gates then unlock strictly in order. An administrative correction or no material impact reopens nothing.
  // The act is written from the session: who and when are never a value the client sends. [ASSUMPTION: R6-Q16]
  async triageChange(
    user: SessionUser,
    id: string,
    changeId: string,
    body: { outcome: string; confirmedGates?: string[]; reason?: string },
    expectedVersion: number,
    idempotencyKey?: string,
  ): Promise<ProjectEnvelope> {
    const scope = 'project.triageChange';
    if (idempotencyKey) {
      const replayed = await this.idempotency.replay(scope, idempotencyKey);
      if (replayed) return replayed as ProjectEnvelope;
    }
    const confirmedGates = [...new Set((body.confirmedGates ?? []).map((g) => String(g).trim()).filter(Boolean))];
    const reason = (body.reason ?? '').trim();
    const missing = triageProblems({ outcome: body.outcome, confirmedGates, reason });
    if (missing.length > 0) throw new BadRequestException(listMessage('The triage still needs:', missing));

    await this.prisma.$transaction(async (tx) => {
      const row = await this.loadVersionLocked(tx, id, expectedVersion);
      const project = toProjectData(row, [], await this.loadReference(tx));
      const c = project.changes.find((x) => x.changeId === changeId);
      if (!c) throw new BadRequestException(`${changeId} is not a change of this project`);
      if (!isChangeOpen(c.status)) throw new BadRequestException(`${changeId} is closed (${c.status}) — its impact can no longer be triaged`);
      if (isTriageRecorded(c)) {
        throw new BadRequestException(`${changeId} was already triaged as "${c.impactTriage}" by ${c.triageBy ?? 'unrecorded'} — a recorded triage is not changed`);
      }
      await this.assertHoldsFunction(tx, id, user, CHANGE_TRIAGE_FUNCTION_KEYS, `assess the impact of ${changeId}`);

      await tx.changeRecord.update({
        where: { changeId },
        data: {
          impactTriage: body.outcome,
          triageReason: reason,
          triageBy: user.displayName,
          triageDate: new Date(),
          confirmedGates: body.outcome === TRIAGE_MATERIAL ? confirmedGates : [],
        },
      });

      let reopenedIds: string[] = [];
      if (body.outcome === TRIAGE_MATERIAL) {
        const standing = confirmedGates.filter((gid) => isGateRecordedPassed(project.gates.find((g) => g.gateId === gid)));
        if (standing.length > 0) {
          const ordered = [...standing].sort((a, b) => gateIndex(a) - gateIndex(b));
          const reopened = await this.reopenGates(tx, id, row, project, ordered, {
            fromGateId: ordered[ordered.length - 1],
            toGateId: ordered[0],
            reason: `Change ${changeId}: ${reason}`,
            initiatedBy: user.displayName,
          });
          reopenedIds = reopened.affected.map((g) => g.gateId);
          await this.audit.record(
            {
              actorId: user.id,
              projectId: id,
              entityType: 'backtrack_event',
              entityId: reopened.event.id,
              action: 'project.backtracked',
              before: {
                previousGates: reopened.previousGates,
                previousSignOffs: reopened.previousSignOffs,
                previousGateSignOffs: reopened.previousGateSignOffs,
              } as unknown as Prisma.InputJsonValue,
              after: { changeId, reason, reopenedGateIds: reopenedIds } as unknown as Prisma.InputJsonValue,
            },
            tx,
          );
        }
      }
      await this.bumpVersion(tx, id);
      await this.audit.record(
        {
          actorId: user.id,
          projectId: id,
          entityType: 'change_record',
          entityId: changeId,
          action: 'change.triaged',
          after: { changeId, outcome: body.outcome, reason, confirmedGates, reopenedGateIds: reopenedIds } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    });
    const envelope = await this.envelope(await this.loadOrThrow(this.prisma, id));
    if (idempotencyKey) {
      await this.prisma.$transaction((tx) =>
        this.idempotency.remember(tx, scope, idempotencyKey, 200, envelope as unknown as Prisma.InputJsonValue),
      );
    }
    return envelope;
  }

  // ------------------------------------------------------- gate mutations ----

  // B1 / F9 / F1 / C7, ported 1:1 from useAppStore.setGate. Returns the decision
  // that may actually be recorded: `existing.decision` when the requested one is
  // rejected (bulk semantics), or throws when `strict` (single-gate PUT, where
  // silently ignoring the request would be a lie to the caller).
  private resolveDecision(
    project: ProjectData,
    changes: Prisma.JsonObject[],
    gateId: string,
    existing: GateRecord,
    requested: GateRecord['decision'],
    // The gate as it will be AFTER this patch — status and the eight gap-assessment
    // fields included. Passing the merged record rather than the stored one plus a
    // status matters for question 3: a save that records the criticality and the
    // decision together must be judged on the criticality it is writing, not the
    // one that happened to be stored a moment ago.
    nextGate: GateRecord,
    openChangeGateNumbers: Set<string>,
    strict: boolean,
    // Readiness items to leave out — only ever this gate's own sign-off items,
    // when a per-market approver signs one lane while others are still open (B2).
    skipItemIds: string[] = [],
    // The market whose lane is being signed (Gates 10-12). The items that are a market's OWN requirements are judged on that market's
    // slice, so a finding or a label row open in Vietnam no longer holds Singapore's lane (Round 5 question 2(c)); every other item
    // still judges the whole project. Omitted for the gate's own decision, which is the whole project's.
    market?: string,
  ): GateRecord['decision'] {
    if (requested !== 'Proceed' && requested !== 'Proceed with Conditions') return requested;

    const reject = (reason: string): GateRecord['decision'] => {
      if (strict) throw new BadRequestException(reason);
      return existing.decision;
    };

    // B1 as graded by Round 4 question 3 (2026-08-24). A Gap used to block only a
    // plain Proceed; now what it blocks depends on the criticality a reviewer
    // recorded, and an UNGRADED gap blocks both decisions — the grading is the
    // reviewer's act, so "nobody graded it" is not a state the gate passes in.
    //
    // Evaluated against the gate as it will be after this patch (`status` is the
    // requested status, the gap fields come from the merged record), so changing the
    // status and the decision in one save cannot slip past it.
    const gapVerdict = gapBlocksDecision(nextGate, requested, project.nextActions);
    if (gapVerdict) {
      // `missing` means the decision becomes valid once those fields are recorded,
      // so the message must not tell the caller to pick a different decision — the
      // same wording bug the Gate Flow table had, and a message from the API is the
      // one a script or another client sees.
      const fix = gapVerdict.missing?.length
        ? `Record ${gapVerdict.missing.join(', ')} on the gap assessment, or choose ` +
          `${gapVerdict.allowed.map((d) => `"${d}"`).join(' or ')} instead`
        : `Record ${gapVerdict.allowed.map((d) => `"${d}"`).join(' or ')} instead`;
      return reject(`Gate ${gateId}: "${requested}" is not valid — ${gapVerdict.reason}. ${fix}`);
    }

    if (requested === 'Proceed') {
      // F9: an open change control record affecting this gate soft-locks it.
      const gateNumber = GATES.find((g) => g.id === gateId)?.number;
      if (gateNumber && openChangeGateNumbers.has(gateNumber)) {
        return reject(
          `Gate ${gateId}: an open change control record affects this gate — record "Proceed with Conditions" instead`,
        );
      }
    }

    // F1/C7: Mandatory evidence blocks both decisions; Proceed with Conditions
    // clears only the softer open-non-critical-next-action blocker.
    const blockers = (
      requested === 'Proceed'
        ? gateBlockers(project, gateId, requested, market)
        : hardGateBlockers(project, gateId, market)
    ).filter((b) => !skipItemIds.includes(b.id));
    if (blockers.length > 0) {
      return reject(
        reasonsMessage(`Gate ${gateId}: "${requested}" is not valid yet. Still to resolve:`, blockers),
      );
    }
    void changes;
    return requested;
  }

  // B5 (SME rule audit, 2026-10-04): reopening a gate — Backtrack (B4) or a Major
  // formula version (A2) — invalidated the PHASE sign-offs and the register
  // closings but left the GATE sign-offs standing, so a reopened gate still carried
  // the three signatures given for the evidence that was just thrown open. Clears
  // the signature on every lane of the reopened gates, keeping the nomination (the
  // same people re-sign), and returns what was cleared so the caller can put it on
  // the audit record — B4's "never deletes" for a signature means it stays
  // readable somewhere after it stops counting.
  private async clearGateSignOffs(tx: Prisma.TransactionClient, projectId: string, gateIds: string[]): Promise<Prisma.JsonObject[]> {
    if (gateIds.length === 0) return [];
    // F4: an older formula version's per-market lanes are history for THAT
    // version — reopening gates on the current version must not touch them.
    const current = await this.currentVersionId(tx, projectId);
    const signed = await tx.gateSignOff.findMany({
      where: {
        projectId,
        gateId: { in: gateIds },
        signedAt: { not: null },
        OR: [{ formulaVersionId: null }, { formulaVersionId: current }],
      },
    });
    if (signed.length === 0) return [];
    await tx.gateSignOff.updateMany({
      where: { id: { in: signed.map((g) => g.id) } },
      data: {
        name: null,
        initials: null,
        signedByUserId: null,
        signedAt: null,
        roleAtSigning: null,
        decision: null,
        comment: null,
        signatureImage: null,
        signatureVerifiedAt: null,
        snapshot: Prisma.DbNull,
      },
    });
    return signed.map((g) => ({
      gateId: g.gateId,
      market: g.market,
      role: g.role,
      name: g.name,
      signedByUserId: g.signedByUserId,
      signedAt: g.signedAt?.toISOString() ?? null,
      roleAtSigning: g.roleAtSigning,
      decision: g.decision,
      comment: g.comment,
    }));
  }

  // C4: phases AFTER the one a reopen goes back to are locked again, so what is
  // entered in them from now on is pre-work again (F13) — the acceptance given
  // when they first opened no longer covers it.
  private async clearPreWorkAcceptance(tx: Prisma.TransactionClient, projectId: string, reopenedPhase: number): Promise<void> {
    await tx.phaseClosure.updateMany({
      where: { projectId, phase: { gt: reopenedPhase } },
      data: { preWorkAcceptedBy: null, preWorkAcceptedDate: null },
    });
  }

  // The readiness items on this gate that read its own sign-off.
  private signOffItemIds(gateId: string): string[] {
    return (GATE_READINESS[gateId] ?? []).filter((r) => r.check.kind === 'gateSignedOff').map((r) => r.id);
  }

  // B3 (SME rule audit, 2026-10-04) — question 29(5): "the approver's decision
  // IS the gate decision … no separate duplicate decision after approval." The
  // Gate Flow dropdown was a second way to record the same thing, and the one
  // that let a gate pass on Proceed although its approver had signed Hold. So it
  // can no longer record a passing decision at all, nor change any decision once
  // an approver has signed on this gate — withdrawing that signature is the way.
  private assertDecisionNotSignedElsewhere(project: ProjectData, gateId: string, existing: GateRecord, requested: GateRecord['decision']): void {
    if ((requested ?? null) === (existing.decision ?? null)) return;
    if (requested && GATE_PASSING_DECISIONS.includes(requested)) {
      throw new BadRequestException(
        `Gate ${gateId}: "${requested}" is recorded by the approver's sign-off, not set directly (question 29(5))`,
      );
    }
    // F4: an older formula version's lanes are history and do not hold this gate.
    if (
      project.gateSignOffs.some(
        (g) =>
          g.gateId === gateId &&
          g.role === 'Approved by' &&
          g.signedAt &&
          (!g.market || g.formulaVersion === project.formulaVersion),
      )
    ) {
      throw new BadRequestException(
        `Gate ${gateId}: an approver has signed this gate, so its decision is theirs — withdraw that signature to change it`,
      );
    }
  }

  // Gate numbers with an open change control record, for the F9 guard. Change
  // Control is a global table (not per project) in the frontend store; the same
  // shared config decides which gates a trigger affects.
  private async openChangeGateNumbers(tx: Prisma.TransactionClient, projectId: string): Promise<Set<string>> {
    const rows = await tx.changeRecord.findMany({ where: { projectId } });
    const numbers = new Set<string>();
    for (const c of rows) {
      if (!isChangeOpen(c.status as never)) continue;
      const trigger = c.triggerId ? getChangeTrigger(c.triggerId) : undefined;
      if (!trigger) continue;
      if (trigger.gates.includes('ALL')) {
        for (const g of GATES) numbers.add(g.number);
      } else {
        for (const n of trigger.gates) numbers.add(n);
      }
    }
    return numbers;
  }

  async updateGate(
    user: SessionUser,
    id: string,
    gateId: string,
    patch: Partial<GateRecord>,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const actorId = user.id;
    const projectId = await this.prisma.$transaction(async (tx) => {
      const row = await this.loadVersionLocked(tx, id, expectedVersion);
      const project = toProjectData(row, [], await this.loadReference(tx));
      const signedLanes = this.standingGateSignatures(project);
      const existing = project.gates.find((g) => g.gateId === gateId);
      if (!existing) throw new NotFoundException(`Gate ${gateId} not found on project ${id}`);
      // Only a decision change needs authority — owner/due date/evidence/notes are ordinary contribution (rule A4).
      if ('decision' in patch) this.assertCanDecide(user, project, gateId);
      // B4: only the single gate currently open for work may be edited directly.
      if (!isGateUnlocked(project, gateId)) {
        throw new ForbiddenException(
          `Gate ${gateId} is not the gate currently open for work — correcting a passed gate requires a Backtrack`,
        );
      }

      // Round 4 questions 32(c) / 34(d). Inside the transaction because it reads
      // the project's flagged findings and open changes, which `assertCanDecide`
      // above cannot see — that runs before the row is loaded.
      if ('gapAssessor' in patch) assertSelfAttested('Gap assessor', existing.gapAssessor, patch.gapAssessor, user.displayName);
      if ('decision' in patch) {
        this.assertDecisionNotSignedElsewhere(project, gateId, existing, patch.decision);
        await this.assertCanCarryConditions(user, project, gateId, patch.decision);
      }
      const decision = this.resolveDecision(
        project,
        [],
        gateId,
        existing,
        'decision' in patch ? patch.decision : existing.decision,
        { ...existing, ...patch },
        await this.openChangeGateNumbers(tx, id),
        true,
      );

      const next: Partial<GateRecord> = { ...patch, ...('decision' in patch ? { decision } : {}) };
      const changes = diffGateRecord(existing, next);
      if (changes.length === 0) return id; // nothing actually changed — no write, no audit row

      await tx.gateRecord.update({
        where: { projectId_gateId: { projectId: id, gateId } },
        data: this.gateWriteData(next),
      });
      await this.assertSignedContentUnchanged(tx, id, signedLanes);
      await this.bumpVersion(tx, id);
      await this.audit.record(
        {
          actorId,
          projectId: id,
          entityType: GATE_ENTITY,
          entityId: gateId,
          action: 'gate.updated',
          before: existing as unknown as Prisma.InputJsonValue,
          after: { changes } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
      return id;
    });
    return this.envelope(await this.loadOrThrow(this.prisma, projectId));
  }

  // Bulk save from the Phase Gate Flow table's Save button. Same guard, but an
  // invalid decision only drops the `decision` field — every other valid field
  // edit on that row is still applied (matching setGatesBulk).
  async updateGates(
    user: SessionUser,
    id: string,
    gates: (Partial<GateRecord> & { gateId: string })[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const actorId = user.id;
    await this.prisma.$transaction(async (tx) => {
      const row = await this.loadVersionLocked(tx, id, expectedVersion);
      const project = toProjectData(row, [], await this.loadReference(tx));
      // For every row that carries a decision, before anything is written, so a bulk save cannot bury one gate's decision
      // among rows the user may edit.
      for (const update of gates) {
        if ('decision' in update) this.assertCanDecide(user, project, update.gateId);
      }
      const signedLanes = this.standingGateSignatures(project);
      const openChanges = await this.openChangeGateNumbers(tx, id);
      let wrote = false;

      for (const update of gates) {
        const existing = project.gates.find((g) => g.gateId === update.gateId);
        if (!existing || !isGateUnlocked(project, update.gateId)) continue;
        // Round 4 questions 32(c) / 34(d) — same check as the single-gate path.
        // Deliberately THROWS rather than skipping the row, unlike the `strict:
        // false` treatment `resolveDecision` gets here: a missing grant is an
        // authorisation failure, not a rule the bulk save can quietly decline to
        // apply. Silently dropping it would tell the user their save succeeded.
        if ('gapAssessor' in update) {
          assertSelfAttested(`${update.gateId} gap assessor`, existing.gapAssessor, update.gapAssessor, user.displayName);
        }
        if ('decision' in update) {
          this.assertDecisionNotSignedElsewhere(project, update.gateId, existing, update.decision);
          await this.assertCanCarryConditions(user, project, update.gateId, update.decision);
        }
        const decision = this.resolveDecision(
          project,
          [],
          update.gateId,
          existing,
          'decision' in update ? update.decision : existing.decision,
          { ...existing, ...update },
          openChanges,
          false,
        );
        const next: Partial<GateRecord> = { ...update, decision };
        const changes = diffGateRecord(existing, next);
        if (changes.length === 0) continue;
        await tx.gateRecord.update({
          where: { projectId_gateId: { projectId: id, gateId: update.gateId } },
          data: this.gateWriteData(next),
        });
        await this.audit.record(
          {
            actorId,
            projectId: id,
            entityType: GATE_ENTITY,
            entityId: update.gateId,
            action: 'gate.updated',
            before: existing as unknown as Prisma.InputJsonValue,
            after: { changes } as unknown as Prisma.InputJsonValue,
          },
          tx,
        );
        wrote = true;
      }
      if (wrote) {
        await this.assertSignedContentUnchanged(tx, id, signedLanes);
        await this.bumpVersion(tx, id);
      }
    });
    return this.envelope(await this.loadOrThrow(this.prisma, id));
  }

  // B4 backtrack, ported 1:1 from useAppStore.backtrackGate: the range INCLUDES
  // fromGateId, every phase with at least one gate in the range loses ALL three
  // sign-offs, and nothing is deleted — the prior gates and sign-offs are
  // snapshotted into an immutable BacktrackEvent first.
  // Reopens a SET of gates and records what they held (B4 — no silent corrections): the pre-reopen gate records and the phase sign-offs
  // are snapshotted into an immutable backtrack event, the gates go back to Not Started, every gate-level and phase-level signature over
  // them is cleared (the previous values live on the event), and the registers whose closing gate is among them reopen too. A Backtrack
  // reopens a contiguous range; a change confirmed as materially impacting reopens exactly the scope Quality confirmed (Round 5
  // question 10), which need not be contiguous. Gates unlock strictly in order afterwards, so the dependency order holds by itself.
  private async reopenGates(
    tx: Prisma.TransactionClient,
    id: string,
    row: ProjectWithAll,
    project: ProjectData,
    gateIds: string[],
    event: { fromGateId: string; toGateId: string; reason: string; initiatedBy: string },
  ) {
    const set = new Set(gateIds);
    const inRange = (gid: string) => set.has(gid);
    const indexes = gateIds.map((g) => gateIndex(g)).filter((i) => i >= 0).sort((x, y) => x - y);
    const toIdx = indexes[0];

    const affected = project.gates.filter((g) => inRange(g.gateId));
    const previousGates = affected.map((g) => ({ ...g }));

    const affectedPhases = new Set<number>();
    for (const idx of indexes) affectedPhases.add(GATES[idx].phase);

    const previousSignOffs: Record<number, SignOff[]> = {};
    for (const phase of affectedPhases) {
      const closure = row.phaseClosures.find((c) => c.phase === phase);
      if (!closure) continue;
      previousSignOffs[phase] = closure.signOffs.map((s) => ({
        role: s.role as SignOff['role'],
        assignedToUserId: s.assignedToUserId ?? undefined,
        name: s.name ?? undefined,
        initials: s.initials ?? undefined,
        date: s.date ? s.date.toISOString().slice(0, 10) : undefined,
        decision: (s.decision ?? undefined) as SignOff['decision'],
        comments: s.comments ?? undefined,
        signedByUserId: s.signedByUserId ?? undefined,
        signedAt: s.signedAt ? s.signedAt.toISOString() : undefined,
        roleAtSigning: s.roleAtSigning ?? undefined,
        recordVersion: s.recordVersion ?? undefined,
      }));
    }

    const created = await tx.backtrackEvent.create({
      data: {
        projectId: id,
        // C8 (SME rule audit, 2026-10-04): the person who backtracked is the signed-in user — B4's "who" cannot be a value the client chooses.
        initiatedBy: event.initiatedBy,
        reason: event.reason,
        fromGateId: event.fromGateId,
        toGateId: event.toGateId,
        reopenedGateIds: affected.map((g) => g.gateId),
        previousGates: previousGates as unknown as Prisma.InputJsonValue,
        previousSignOffs: previousSignOffs as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.gateRecord.updateMany({
      where: { projectId: id, gateId: { in: affected.map((g) => g.gateId) } },
      data: { status: 'Not Started', decision: null },
    });
    const previousGateSignOffs = await this.clearGateSignOffs(tx, id, affected.map((g) => g.gateId));
    await this.clearPreWorkAcceptance(tx, id, GATES[toIdx].phase);

    for (const phase of affectedPhases) {
      const closure = row.phaseClosures.find((c) => c.phase === phase);
      if (!closure) continue;
      // Clear the signature fields but keep the rows (one per role) — the previous values live on the immutable event created above.
      await tx.signOff.updateMany({
        where: { phaseClosureId: closure.id },
        data: {
          name: null,
          initials: null,
          date: null,
          decision: null,
          comments: null,
          signedByUserId: null,
          signedAt: null,
          roleAtSigning: null,
          recordVersion: null,
        },
      });
    }

    // Register closing (2026-08-27): a register whose OWN threshold gate (gateRefHighestGateId) falls inside the reopened set must reopen
    // too — otherwise a reopening could reopen Gate 5 while a register that had to close BEFORE Gate 5 stays closed.
    const reopenedRegisterKeys = REGISTER_CONFIGS.filter((config) => {
      const thresholdId = gateRefHighestGateId(config.gate);
      return thresholdId && inRange(thresholdId);
    }).map((config) => config.key);
    if (reopenedRegisterKeys.length > 0) {
      await tx.registerClosureSignOff.updateMany({
        where: { closure: { projectId: id, registerKey: { in: reopenedRegisterKeys } } },
        data: {
          name: null,
          signedByUserId: null,
          signedAt: null,
          roleAtSigning: null,
          recordVersion: null,
          signatureImage: null,
          signatureVerifiedAt: null,
          contentHash: null,
        },
      });
    }
    return { event: created, affected, previousGates, previousSignOffs, previousGateSignOffs };
  }

  async backtrack(
    user: SessionUser,
    id: string,
    body: { fromGateId: string; toGateId: string; reason: string; initiatedBy?: string },
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<ProjectEnvelope> {
    const actorId = user.id;
    const scope = 'project.backtrack';
    const replayed = await this.idempotency.replay(scope, idempotencyKey);
    if (replayed) return replayed as ProjectEnvelope;

    const fromIdx = gateIndex(body.fromGateId);
    const toIdx = gateIndex(body.toGateId);
    if (fromIdx < 0 || toIdx < 0 || toIdx >= fromIdx) {
      throw new BadRequestException('Backtrack target must be an earlier gate than the gate backtracked from');
    }
    if (!body.reason?.trim()) throw new BadRequestException('A backtrack reason is required');

    await this.prisma.$transaction(async (tx) => {
      const row = await this.loadVersionLocked(tx, id, expectedVersion);
      const project = toProjectData(row, [], await this.loadReference(tx));
      // Backtrack is picked from the same decision dropdown, so it needs the same authority on the gate being backtracked
      // FROM — and it is strictly more destructive (it reopens a whole range and voids sign-offs).
      this.assertCanDecide(user, project, body.fromGateId);
      const reopened = await this.reopenGates(
        tx,
        id,
        row,
        project,
        GATES.slice(toIdx, fromIdx + 1).map((g) => g.id),
        { fromGateId: body.fromGateId, toGateId: body.toGateId, reason: body.reason.trim(), initiatedBy: user.displayName },
      );
      const { event, affected, previousGates, previousSignOffs, previousGateSignOffs } = reopened;

      await this.bumpVersion(tx, id);
      await this.audit.record(
        {
          actorId,
          projectId: id,
          entityType: 'backtrack_event',
          entityId: event.id,
          action: 'project.backtracked',
          before: { previousGates, previousSignOffs, previousGateSignOffs } as unknown as Prisma.InputJsonValue,
          after: {
            fromGateId: body.fromGateId,
            toGateId: body.toGateId,
            reason: body.reason.trim(),
            reopenedGateIds: affected.map((g) => g.gateId),
          },
        },
        tx,
      );
    });

    const envelope = await this.envelope(await this.loadOrThrow(this.prisma, id));
    await this.prisma.$transaction((tx) =>
      this.idempotency.remember(tx, scope, idempotencyKey, 200, envelope as unknown as Prisma.InputJsonValue),
    );
    return envelope;
  }

  // ------------------------------------------------------------- helpers ----

  // An archived project is READ-ONLY (2026-07-26, user-requested: "a project that
  // has been archived may not have its data changed any more, unless it is
  // brought back"). Enforced here rather than per-endpoint because every
  // project-data mutation goes through loadVersionLocked below — which also means
  // the Phase 2-6 endpoints inherit it for free instead of each having to
  // remember. Deliberately NOT applied to `setArchived` (restore is the way out
  // of the archive) or `remove` (an admin must still be able to delete an
  // archived project — that is the natural archive-then-delete flow); both do
  // their own lookup precisely so they bypass this.
  private assertMutable(row: { id: string; archivedAt: Date | null; stoppedAt?: Date | null }): void {
    // SW-31: a stopped project is final. Unlike an archive there is no way back, so nothing bypasses this
    // except deletion by an administrator.
    if (row.stoppedAt) {
      throw new ForbiddenException(`Project ${row.id} was stopped and is read-only — it cannot be changed again`);
    }
    if (row.archivedAt) {
      throw new ForbiddenException(
        `Project ${row.id} is archived and read-only — restore it before making changes`,
      );
    }
  }

  // Reads the project FOR UPDATE (row lock) and rejects a stale writer, so the
  // guard evaluation below cannot be based on data another request is changing.
  private async loadVersionLocked(
    tx: Prisma.TransactionClient,
    id: string,
    expectedVersion: number | null,
  ): Promise<ProjectWithAll> {
    await tx.$queryRaw`SELECT id FROM projects WHERE id = ${id} FOR UPDATE`;
    const row = await this.loadOrThrow(tx, id);
    this.assertMutable(row);
    if (expectedVersion === null) return row;
    // C12 (SME rule audit, 2026-10-04): a missing version used to skip the check
    // entirely, so any client that left it out wrote last-write-wins — exactly
    // what BACKEND_PLAN §3 principle 8 exists to prevent. Every project write the
    // web makes sends one; a write without one is refused rather than trusted.
    if (!Number.isInteger(expectedVersion)) {
      throw new BadRequestException('expectedVersion is required — reload the project and try again');
    }
    if (expectedVersion !== row.version) {
      throw new ConflictException({
        message: 'This project was updated by someone else — reload before saving',
        expectedVersion,
        currentVersion: row.version,
      });
    }
    return row;
  }

  // Round 5 question 1(d) (our reading of the details: [ASSUMPTION: R6-Q6]). A change to the company lists raises an impact
  // assessment for every live project that relies on the entry and has already passed a gate, owned by the function that judges that
  // kind of list. The person who made the change raises it, may mark it Critical (a Critical one holds release, see
  // utils/impactAssessments.ts) and must give the date the reviews are due. Called inside the list write's own transaction, so the
  // change, its signal and the assessments commit together.
  async raiseReferenceSignal(
    tx: Prisma.TransactionClient,
    user: SessionUser,
    input: {
      dataset: ImpactDataset;
      entryId: string;
      subject: string;
      summary: string;
      // Round 5 question 6(a): the four-level criticality, PROPOSED by the person who changed the list.
      criticality: 'Low' | 'Medium' | 'High' | 'Critical';
      // An urgent safety issue or mandatory restriction: holds release at once and escalates (question 6(b)).
      urgent: boolean;
      // A safety issue is involved: Safety contributes to the assessment.
      safetyIssue: boolean;
      reason?: string;
      dueDate?: string;
    },
  ): Promise<{ affected: number }> {
    const reason = (input.reason ?? '').trim();
    const dueDate = (input.dueDate ?? '').trim();
    const critical = input.criticality === 'Critical';
    if (critical && reason === '') {
      throw new BadRequestException('A Critical change needs its reason: what the safety issue, prohibition or restriction is');
    }
    if (dueDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      throw new BadRequestException('The impact review due date must be a date (YYYY-MM-DD)');
    }
    const rows = await tx.project.findMany({ where: { archivedAt: null, stoppedAt: null }, include: PROJECT_INCLUDE });
    const reference = await this.loadReference(tx);
    const label = IMPACT_DATASET_LABELS[input.dataset] as Parameters<typeof entryTouchesProject>[1];
    const affected = rows
      .map((r) => toProjectData(r, [], reference))
      .filter((p) => projectHasPassedGate(p) && entryTouchesProject(p, label, this.impactKey(input)));
    if (affected.length === 0) return { affected: 0 };
    if (dueDate === '') {
      throw new BadRequestException(
        `${affected.length} project(s) rely on this entry and each needs an impact review: give the date it is due`,
      );
    }
    const signal = await tx.referenceSignal.create({
      data: {
        dataset: input.dataset,
        entryId: input.entryId,
        subject: input.subject,
        summary: input.summary,
        critical,
        criticality: input.criticality,
        urgent: input.urgent,
        safetyIssue: input.safetyIssue,
        reason: reason || null,
        dueDate,
        raisedById: user.id,
      },
    });
    for (const p of affected) {
      const created = await tx.impactAssessment.create({
        data: {
          signalId: signal.id,
          projectId: p.identity.id,
          functionKeys: impactFunctionsFor(input.dataset, { safetyIssue: input.safetyIssue, urgent: input.urgent }),
          markets: input.dataset === 'market-profile' ? [input.subject] : p.identity.markets,
        },
      });
      await this.audit.record(
        {
          actorId: user.id,
          projectId: p.identity.id,
          entityType: 'impact_assessment',
          entityId: created.id,
          action: 'impact_assessment.opened',
          after: {
            dataset: input.dataset,
            subject: input.subject,
            summary: input.summary,
            criticality: input.criticality,
            urgent: input.urgent,
            safetyIssue: input.safetyIssue,
            dueDate,
          },
        },
        tx,
      );
      await this.bumpVersion(tx, p.identity.id);
    }
    return { affected: affected.length };
  }

  // The key a list entry is known by on a project: the material code, the market name or the Claims Library entry id.
  private impactKey(input: { dataset: ImpactDataset; entryId: string; subject: string }): string {
    return input.dataset === 'claims-library' ? input.entryId : input.subject;
  }

  // A function holder records what the change means for this project. Final for that function (the record is kept, SW-38); the
  // assessment concludes, and a hold ends, when every function has. The person who raised the signal cannot conclude it, and an
  // administrator is not the holder of a function.
  async concludeImpactAssessment(
    user: SessionUser,
    id: string,
    assessmentId: string,
    input: { functionKey: string; conclusion: string; rationale: string; linkedChangeId?: string; affects?: string[] },
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'impact_assessment.concluded', async (tx, _row, project) => {
      const a = project.impactAssessments.find((x) => x.id === assessmentId);
      if (!a) throw new NotFoundException(`Impact assessment ${assessmentId} not found on this project`);
      if (a.concludedAt) throw new BadRequestException('This impact assessment is already concluded');
      if (!a.functionKeys.includes(input.functionKey)) {
        throw new BadRequestException(`"${input.functionKey}" is not one of the functions that conclude this assessment`);
      }
      if (a.conclusions.some((c) => c.functionKey === input.functionKey)) {
        throw new BadRequestException('This function has already recorded its conclusion');
      }
      const functionLabel = REVIEW_ROLES.find((r) => r.key === input.functionKey)?.label ?? input.functionKey;
      const holder = await tx.projectReviewer.findUnique({ where: { projectId_roleKey: { projectId: id, roleKey: input.functionKey } } });
      if (!holder) {
        throw new BadRequestException(
          `Nobody is assigned as ${functionLabel} on this project yet, so nobody can conclude this — the project's Lead assigns one in Project team`,
        );
      }
      if (!holdsRole(holder, user)) {
        throw new ForbiddenException(`Only ${holder.name}, who holds ${functionLabel} on this project, may conclude this as ${functionLabel}`);
      }
      if (a.raisedById && a.raisedById === user.id) {
        throw new ForbiddenException('You raised this change, so someone else must conclude its impact');
      }
      const problem = impactConclusionProblem(
        { conclusion: input.conclusion, rationale: input.rationale ?? '', linkedChangeId: input.linkedChangeId, affects: input.affects },
        project.changes.map((c) => c.changeId),
        a.dataset,
      );
      if (problem) throw new BadRequestException(problem);

      const record = {
        functionKey: input.functionKey,
        conclusion: input.conclusion,
        rationale: input.rationale.trim(),
        ...(a.dataset === 'claims-library' ? { affects: input.affects } : {}),
        ...(input.conclusion === 'Impact on this project' ? { linkedChangeId: (input.linkedChangeId ?? '').trim() } : {}),
        concludedBy: user.displayName,
        concludedById: user.id,
        concludedAt: new Date().toISOString(),
      };
      const conclusions = [...a.conclusions, record];
      const complete = a.functionKeys.every((k) => conclusions.some((c) => c.functionKey === k));
      await tx.impactAssessment.update({
        where: { id: assessmentId },
        data: { conclusions: conclusions as unknown as Prisma.InputJsonValue, concludedAt: complete ? new Date() : null },
      });
      return { assessmentId, functionKey: input.functionKey, conclusion: input.conclusion, concluded: complete } as Prisma.InputJsonValue;
    });
  }

  // Round 5 question 6(b): "Criticality is confirmed by the relevant qualified function(s)". The holder of one of the functions named on the
  // assessment confirms that a proposed Critical change IS critical on this project — and from then on it holds release. Whoever raised the
  // change cannot confirm their own proposal, and an administrator is not the holder of a function (SW-57). An urgent change needs no
  // confirmation: it holds at once.
  async confirmImpactCriticality(
    user: SessionUser,
    id: string,
    assessmentId: string,
    input: { functionKey: string },
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'impact_assessment.criticality_confirmed', async (tx, _row, project) => {
      const a = project.impactAssessments.find((x) => x.id === assessmentId);
      if (!a) throw new NotFoundException(`Impact assessment ${assessmentId} not found on this project`);
      if (a.concludedAt) throw new BadRequestException('This impact assessment is already concluded');
      if (!a.critical) throw new BadRequestException('This change was not proposed as Critical, so there is nothing to confirm');
      if (a.urgent) throw new BadRequestException('This change is urgent: it already holds release and needs no confirmation');
      if (a.criticalConfirmed) throw new BadRequestException(`Already confirmed by ${a.criticalConfirmed.by}`);
      if (!a.functionKeys.includes(input.functionKey)) {
        throw new BadRequestException(`"${input.functionKey}" is not one of the functions on this assessment`);
      }
      const functionLabel = REVIEW_ROLES.find((r) => r.key === input.functionKey)?.label ?? input.functionKey;
      const holder = await tx.projectReviewer.findUnique({ where: { projectId_roleKey: { projectId: id, roleKey: input.functionKey } } });
      if (!holder) {
        throw new BadRequestException(
          `Nobody is assigned as ${functionLabel} on this project yet, so nobody can confirm this — the project's Lead assigns one in Project team`,
        );
      }
      if (!holdsRole(holder, user)) {
        throw new ForbiddenException(`Only ${holder.name}, who holds ${functionLabel} on this project, may confirm this as ${functionLabel}`);
      }
      if (a.raisedById && a.raisedById === user.id) {
        throw new ForbiddenException('You proposed this as Critical, so someone else must confirm it');
      }
      const confirmed = { by: user.displayName, functionKey: input.functionKey, at: new Date().toISOString() };
      await tx.impactAssessment.update({
        where: { id: assessmentId },
        data: { criticalConfirmed: confirmed as unknown as Prisma.InputJsonValue },
      });
      return { assessmentId, confirmedBy: user.displayName, functionKey: input.functionKey };
    });
  }

  private async bumpVersion(tx: Prisma.TransactionClient, id: string): Promise<void> {
    await tx.project.update({ where: { id }, data: { version: { increment: 1 } } });
    await this.syncGateReferenceSnapshots(tx, id);
  }

  // SW-52 / Round 5 question 1(d). Keeps one ACTIVE copy of the company lists for every gate that is stamped passed (Complete with a
  // Proceed decision), taken at the moment it first reads that way, and retires the copy of a gate that no longer does (a Backtrack
  // reopened it) — retired, not deleted (SW-38), so the next pass takes a new one. It runs wherever the version is bumped, which is
  // every project write, so no path that records a decision can forget it. Two small reads decide whether there is anything to do;
  // the lists are only loaded when there is.
  private async syncGateReferenceSnapshots(tx: Prisma.TransactionClient, id: string): Promise<void> {
    const gates = await tx.gateRecord.findMany({ where: { projectId: id }, select: { gateId: true, status: true, decision: true } });
    const stamped = new Set(
      gates.filter((g) => g.status === 'Complete' && (g.decision === 'Proceed' || g.decision === 'Proceed with Conditions')).map((g) => g.gateId),
    );
    const active = await tx.gateReferenceSnapshot.findMany({ where: { projectId: id, supersededAt: null }, select: { id: true, gateId: true } });
    const held = new Set(active.map((a) => a.gateId));
    const retire = active.filter((a) => !stamped.has(a.gateId)).map((a) => a.id);
    const take = [...stamped].filter((g) => !held.has(g));
    if (retire.length > 0) {
      await tx.gateReferenceSnapshot.updateMany({ where: { id: { in: retire } }, data: { supersededAt: new Date() } });
    }
    if (take.length > 0) {
      const reference = (await this.loadReference(tx)) as unknown as Prisma.InputJsonValue;
      for (const gateId of take) await tx.gateReferenceSnapshot.create({ data: { projectId: id, gateId, reference } });
    }
  }

  private gateWriteData(next: Partial<GateRecord>): Prisma.GateRecordUpdateInput {
    if ('status' in next) assertOneOf('Stage status', next.status, STAGE_STATUSES);
    if ('decision' in next) assertOneOf('Gate decision', next.decision, GATE_DECISIONS);
    if ('gapCriticality' in next) assertOneOf('Gap criticality', next.gapCriticality, RISK_LEVELS);
    if ('gapImpactCategory' in next) assertOneOf('Gap impact category', next.gapImpactCategory, GAP_IMPACT_CATEGORIES);
    const data: Prisma.GateRecordUpdateInput = {};
    if ('status' in next) data.status = next.status;
    if ('decision' in next) data.decision = next.decision ?? null;
    if ('owner' in next) data.owner = next.owner ?? null;
    if ('dueDate' in next) data.dueDate = next.dueDate ? new Date(next.dueDate) : null;
    if ('evidenceLink' in next) data.evidenceLink = next.evidenceLink ?? null;
    if ('notes' in next) data.notes = next.notes ?? null;
    // Round 4 question 3. Empty string stores as NULL so clearing a grade returns
    // the gap to "not assessed" — which blocks — rather than leaving a blank that
    // the engine would have to guess about.
    for (const field of GAP_ASSESSMENT_FIELDS) {
      if (field in next) data[field] = (next[field] ?? '').trim() || null;
    }
    return data;
  }
}
