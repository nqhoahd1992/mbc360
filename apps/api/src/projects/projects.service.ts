import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { COSTING_FEASIBILITY_STATUSES, GATES, GATE_DECISIONS } from '@mbc360/shared/config/gates';
import { getChangeTrigger, isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { registerClosureSignerRole } from '@mbc360/shared/config/reviewers';
import {
  REGISTER_CONFIGS,
  getRegisterConfig,
  invalidSelectValues,
  signatureColumns,
  signatureFieldKeys,
  type RegisterConfig,
} from '@mbc360/shared/config/registers';
import { diffGateRecord } from '@mbc360/shared/utils/gateDiff';
import { gapBlocksDecision } from '@mbc360/shared/utils/gapCriticality';
import { gate11ConditionalChanges } from '@mbc360/shared/utils/changeImpact';
import { contradictoryClaimRows, publishedInfoViolations } from '@mbc360/shared/utils/claimEvidence';
import { RM_EVIDENCE_REGISTER, rmEvidenceContradictions } from '@mbc360/shared/utils/rmEvidence';
import {
  WATCHLIST_REGISTERS,
  brokenNextActionLinks,
  watchlistConditionalRows,
  watchlistLabel,
} from '@mbc360/shared/utils/watchlistReview';
import {
  VULNERABLE_REGISTER,
  targetUsersPinnedByAssessment,
  vulnerableSaveBlockers,
} from '@mbc360/shared/utils/vulnerableUsers';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import {
  INDEPENDENT_FUNCTION_BY_GATE,
  gateSignOffMarkets,
  gateSignOffNeedsComment,
  isPerMarketGate,
  previousGateSignOffRole,
} from '@mbc360/shared/config/gateSignOff';
import { gateEvidenceSnapshot } from '@mbc360/shared/utils/gateSnapshot';
import { supersessionGaps } from '@mbc360/shared/utils/formulaLifecycle';
import { CLAIM_EXEMPTION_CAPABILITY, frozenRevisionEdits } from '@mbc360/shared/utils/claimEvidence';
import {
  gateBlockers,
  gateIndex,
  gateRefHighestGateId,
  hardGateBlockers,
  isGateRefLocked,
  isGateUnlocked,
  phaseCompletionChecklist,
} from '@mbc360/shared/utils/gateProgress';
import { GATE_SIGNOFF_ROLES, isRegisterClosed } from '@mbc360/shared/types';
import type { GateSignOffRole } from '@mbc360/shared/types';
import type {
  AngleRow,
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
import { TotpService } from '../verification/totp.service';
import {
  PROJECT_INCLUDE,
  toChangeRecords,
  toGateChangeLog,
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
  'changeControlRequired',
  'changeControlReviewer',
  'changeControlReviewDate',
  'changeControlRationale',
  'changeControlRecordId',
  'changeControlEvidenceLink',
  'humanStudyPlanned',
  'administrativeOnly',
  'administrativeOnlyConfirmedBy',
  'scaleUpRiskIdentified',
  'scaleUpRiskDescription',
  'scaleUpRiskAssessor',
  'scaleUpRiskAssessmentDate',
  'scaleUpRiskRationale',
  'scaleUpRiskActivity',
  'scaleUpRiskEvidenceLink',
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
] as const satisfies readonly (keyof GateRecord)[];

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
    } else if (canConfirmExemption) {
      // The confirmer may be the same person as the declarer — the answer names a
      // FUNCTION ("a Technical or Regulatory reviewer"), not a second pair of eyes,
      // and requiring two people would be a stricter rule than it states.
      next.noProductClaimConfirmedBy = actorName;
      next.noProductClaimConfirmedAt = new Date().toISOString().slice(0, 10);
    } else {
      next.noProductClaimConfirmedBy = '';
      next.noProductClaimConfirmedAt = '';
    }
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
  ) {}

  // Binds a step-up code/proof to the exact act — a code minted for one
  // sign-off can never be spent on another, even by the same user.
  private signOffStepUpPurpose(id: string, phase: number, role: string): string {
    return `sign_off:${id}:${phase}:${role}`;
  }

  // A4 / F6: only a role granted `gate:<id>|decide` may record that gate's
  // decision (admin is unrestricted). Contributing evidence needs no permission.
  //
  // This is checked HERE, not only in the browser: the Phase Gate Flow table
  // disables the decision dropdown for a role without the grant, but until this
  // was added (2026-07-26) a plain `curl` could still write one — verified by
  // signing in as Read-only Viewer, which holds zero grants, and successfully
  // recording a decision. Exactly the failure mode BACKEND_PLAN §3 principle 7
  // exists to prevent ("never left as 'the UI already disables it'").
  private async assertCanDecide(user: SessionUser, gateId: string): Promise<void> {
    if (!(await this.permissions.canDecideGate(user, gateId))) {
      throw new ForbiddenException(
        `Your role may not record the decision for gate ${gateId} (needs gate:${gateId}|decide)`,
      );
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

    if (watchlistConditionalRows(project).length > 0 && !(await this.permissions.canAcceptWatchlistFinding(user))) {
      throw new ForbiddenException(
        `Gate ${gateId}: carrying a flagged watch-list finding under Proceed with Conditions needs Safety or Regulatory authority ` +
          `(watchlist-finding|accept-safety or |accept-regulatory)`,
      );
    }
    if (
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
    return {
      project: toProjectData(row, toGateChangeLog(events), await this.loadReference(this.prisma)),
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
    const [marketProfiles, rmRisk, claimsLibrary] = await Promise.all([
      tx.marketProfile.findMany({
        orderBy: { market: 'asc' },
        include: { updatedBy: { select: { displayName: true } } },
      }),
      tx.rawMaterialRisk.findMany({
        orderBy: { rmCode: 'asc' },
        include: { updatedBy: { select: { displayName: true } } },
      }),
      // Round 4 question 28 (2026-08-30). Only the columns the rules read: C1's
      // library condition needs the id and the status, and the UI picker needs the
      // wording and classification. The applicability tags, approval stamps and
      // revision history stay on the admin page — a project reads the library, it
      // does not administer it, and shipping the whole table into every project
      // envelope would be the same over-fetch the Cosmetri picker was fixed for.
      tx.claimLibraryEntry.findMany({
        orderBy: { wording: 'asc' },
        select: { id: true, wording: true, claimCategory: true, claimRisk: true, status: true, revision: true },
      }),
    ]);
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

    const projectId = await this.prisma.$transaction(async (tx) => {
      const { projectId } = await createProjectWithScaffold(tx, input);
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
      const [gates, registerRows, auditRows] = await Promise.all([
        tx.gateRecord.count({ where: { projectId: id } }),
        tx.registerRow.count({ where: { projectId: id } }),
        tx.auditEvent.count({ where: { projectId: id } }),
      ]);

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
    expectedVersion: number,
    action: string,
    write: (
      tx: Prisma.TransactionClient,
      row: ProjectWithAll,
      project: ProjectData,
    ) => Promise<Prisma.InputJsonValue | void>,
  ): Promise<ProjectEnvelope> {
    await this.prisma.$transaction(async (tx) => {
      const row = await this.loadVersionLocked(tx, id, expectedVersion);
      const after = await write(tx, row, toProjectData(row, [], await this.loadReference(tx)));
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
              .join('; '),
          );
        }
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
      await Promise.all(
        items.map((item, index) =>
          tx.checklistItem.update({
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
          }),
        ),
      );
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
      if (items.length !== existing.length) {
        throw new BadRequestException(
          `Requirement section "${section}" expects ${existing.length} rows, received ${items.length}`,
        );
      }
      let skipped = 0;
      for (const [index, item] of items.entries()) {
        const target = existing[index];
        if (isGateRefLocked(project, target.gate)) {
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
            naRationale: item.status === 'N/A' ? (item.naRationale ?? null) : null,
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
    updates: { gate: string; check: string; patch: Partial<GateCheck> }[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'gate_checks.updated', async (tx, row, project) => {
      let skipped = 0;
      for (const update of updates) {
        const target = row.gateChecks.find((c) => c.gate === update.gate && c.check === update.check);
        if (!target || isGateRefLocked(project, target.gate)) {
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
    return this.mutate(user, id, expectedVersion, 'angles.updated', async (tx) => {
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
  private assertIsProjectLead(user: SessionUser, project: ProjectData): void {
    if (this.permissions.isAdmin(user)) return;
    if (project.identity.projectLead.trim() !== user.displayName.trim()) {
      throw new ForbiddenException(
        `Only the project's Lead (${project.identity.projectLead}) may assign phase sign-off signers`,
      );
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
    await this.totp.verifyForStepUp(user.id, code);
    const purpose = this.signOffStepUpPurpose(id, phase, role);
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
    input: { decision?: string; comments?: string; stepUpToken?: string },
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'sign_off.signed', async (tx, row, project) => {
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
      // The "Approved by" row is a phase APPROVAL on top of being a signature,
      // so being assigned is necessary but not sufficient: the role must also
      // hold `phase:N|approve` (project owner's decision, 2026-08-20).
      if (role === 'Approved by' && !(await this.permissions.canApprovePhase(user, phase))) {
        throw new ForbiddenException(
          `Your role may not approve Phase ${phase} (needs phase:${phase}|approve)`,
        );
      }
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
        const expectedPurpose = this.signOffStepUpPurpose(id, phase, role);
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
      return { phase, role, decision, recordVersion: row.version, signatureAttached: !!signatureImage };
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
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const why = reason?.trim();
    if (!why) throw new BadRequestException('A reason is required to withdraw a signature');
    return this.mutate(user, id, expectedVersion, 'sign_off.withdrawn', async (tx) => {
      const closureId = await this.phaseClosureId(tx, id, phase);
      const existing = await tx.signOff.findFirst({ where: { phaseClosureId: closureId, role } });
      if (!existing) throw new NotFoundException(`Sign-off row "${role}" not found on phase ${phase}`);
      if (!existing.signedAt) throw new BadRequestException(`"${role}" is not signed`);
      if (existing.signedByUserId !== user.id && !this.permissions.isAdmin(user)) {
        throw new ForbiddenException(
          `Only ${existing.name ?? 'the signer'} may withdraw this signature`,
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
      return { phase, role, reason: why, previousSigner: existing.name ?? null };
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

  private gateSignOffStepUpPurpose(id: string, gateId: string, market: string | undefined, role: string): string {
    return `gate_sign_off:${id}:${gateId}:${market ?? ''}:${role}`;
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
    return tx.gateSignOff.findMany({ where: { projectId: id, gateId, market: market ?? null } });
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
  private async assertIndependence(
    user: SessionUser,
    gateId: string,
    role: GateSignOffRole,
    rows: { role: string; signedByUserId: string | null }[],
  ): Promise<void> {
    if (role !== 'Prepared by') {
      const preparer = rows.find((r) => r.role === 'Prepared by')?.signedByUserId;
      if (preparer && preparer === user.id) {
        throw new ForbiddenException(
          `You signed "Prepared by" on this gate — the reviewer and approver must be different people`,
        );
      }
    }
    if (role === 'Approved by') {
      const reviewer = rows.find((r) => r.role === 'Reviewed by')?.signedByUserId;
      if (reviewer && reviewer === user.id) {
        throw new ForbiddenException('You signed "Reviewed by" on this gate — the approver must be a different person');
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
            data: { projectId: id, gateId, market: market ?? null, role, assignedToUserId: userId },
          });
        }
      }
      return { gateId, market: market ?? null, roles: Object.keys(assignees) };
    });
  }

  async verifyGateSignOffStepUp(
    user: SessionUser,
    id: string,
    gateId: string,
    market: string | undefined,
    role: GateSignOffRole,
    code: string,
  ): Promise<{ stepUpToken: string }> {
    const existing = await this.prisma.gateSignOff.findFirst({
      where: { projectId: id, gateId, market: market ?? null, role },
    });
    if (!existing) throw new NotFoundException(`"${role}" has no nominated signer on ${gateId} yet`);
    if (existing.signedAt) throw new BadRequestException(`"${role}" is already signed — withdraw it first`);
    if (existing.assignedToUserId !== user.id) {
      throw new ForbiddenException(`"${role}" is assigned to somebody else — only the assigned signer may sign it`);
    }
    const signature = await this.prisma.userSignature.findUnique({ where: { userId: user.id } });
    if (!signature) throw new BadRequestException('Save a signature in My Account before signing');
    await this.totp.verifyForStepUp(user.id, code);
    const purpose = this.gateSignOffStepUpPurpose(id, gateId, market, role);
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
    input: { decision?: string; comment?: string; stepUpToken?: string },
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'gate_sign_off.signed', async (tx, _row, project) => {
      this.assertGateLane(project, gateId, market);
      const rows = await this.loadGateSignOffs(tx, id, gateId, market);
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
        await this.assertCanDecide(user, gateId);
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
              (sofar) => !(sofar.gateId === gateId && (sofar.market ?? undefined) === market && sofar.role === role),
            ),
            {
              gateId,
              ...(market ? { market } : {}),
              role,
              signedByUserId: user.id,
              signedAt: new Date().toISOString(),
              decision: decision as GateRecord['decision'],
            },
          ],
        };
        this.resolveDecision(
          pending,
          [],
          gateId,
          gate,
          decision as GateRecord['decision'],
          { ...gate, decision: decision as GateRecord['decision'] },
          await this.openChangeGateNumbers(tx, id),
          true,
        );
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
        const expectedPurpose = this.gateSignOffStepUpPurpose(id, gateId, market, role);
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
      const snapshot = gateEvidenceSnapshot(project, gateId, market);
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
      if (role === 'Approved by') {
        await tx.gateRecord.update({
          where: { projectId_gateId: { projectId: id, gateId } },
          data: { decision },
        });
      }
      return { gateId, market: market ?? null, role, decision, gateDecisionRecorded: role === 'Approved by' };
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
      return { gateId, market: market ?? null, role, reason: why, previousSigner: existing.name ?? null };
    });
  }

  async setEvidenceSummary(
    user: SessionUser,
    id: string,
    phase: number,
    value: string,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'evidence_summary.updated', async (tx) => {
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
    return this.mutate(user, id, expectedVersion, 'pre_work.accepted', async (tx) => {
      await tx.phaseClosure.update({
        where: { projectId_phase: { projectId: id, phase } },
        data: { preWorkAcceptedBy: user.displayName, preWorkAcceptedDate: new Date() },
      });
      return { phase, acceptedBy: user.displayName };
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
      } else if (before !== undefined && after !== undefined && JSON.stringify(before) !== JSON.stringify(after)) {
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
      // Register closing (2026-08-27) — a SEPARATE, independent lock reason
      // from the gate-based one above: a register can be closed (both
      // Review owner and Co-sign signed) before its own gate has even
      // passed, since closing is now a PRECONDITION for that gate to pass,
      // not a consequence of it having passed. Both checks stay — closing
      // does not replace the gate-based lock, it adds an earlier trigger for
      // the same read-only state.
      if (isRegisterClosed(project.registerClosures[registerKey])) {
        throw new ForbiddenException(
          `Register "${registerKey}" is closed — it is read-only until reopened (withdraw a closing signature, or Backtrack past its gate)`,
        );
      }
      // A `select` cell may only hold one of its own options (2026-08-29). Until
      // this, the dropdown existed only in the browser and the API took any
      // string — so a direct call could store a value nobody could pick, and any
      // readiness rule reading that column would decide a gate on it. Found while
      // verifying Round 4 question 6, whose new `gate4Disposition` is exactly such
      // a rule input. Blank stays legal: it is how an unanswered cell reads.
      const badSelects = invalidSelectValues(config, rows);
      if (badSelects.length > 0) {
        throw new BadRequestException(
          `${badSelects.length} cell(s) hold a value that is not an option of their column: ${badSelects
            .map((b) => `row ${b.row + 1} "${b.label}" -> "${b.value}"`)
            .join('; ')}`,
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
        const bad = publishedInfoViolations(rows, claimRows);
        if (bad.length > 0) {
          throw new BadRequestException(
            `${bad.length} Published Information row(s) cannot sit at a released workflow state: ${bad
              .map((v) => `${String(v.row.recordId ?? '(no record id)')} — ${v.reason}`)
              .join('; ')}`,
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
        const frozen = frozenRevisionEdits(project.registers[registerKey] ?? [], rows);
        if (frozen.length > 0) {
          throw new BadRequestException(
            `${frozen.length} claim revision(s) are approved and read-only: ${frozen
              .map((f) => `${f.claimId} (${f.changed.join(', ')})`)
              .join('; ')}. Record a new revision or a new Claim ID instead — the reviewer decides which.`,
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
      if (registerKey === VULNERABLE_REGISTER) {
        const blockers = vulnerableSaveBlockers(project, rows);
        if (blockers.length > 0) {
          throw new BadRequestException(`Vulnerable-User Assessment: ${blockers.join('; ')}.`);
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
      const rowDiff = this.diffRegisterRows(project.registers[registerKey] ?? [], rowsToWrite);
      await tx.registerRow.deleteMany({ where: { projectId: id, registerKey } });
      if (rowsToWrite.length > 0) {
        await tx.registerRow.createMany({
          data: rowsToWrite.map((data, rowOrder) => ({
            projectId: id,
            registerKey,
            rowOrder,
            data: data as Prisma.InputJsonValue,
            updatedById: user.id,
          })),
        });
      }
      return { registerKey, rows: rowsToWrite.length, changes: rowDiff };
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
    // The derived "approved?" tick that pairs with the signature. Held as its
    // own column so the table can show it, but it states the same fact the
    // signature does, so the signature decides it.
    if (cols.some((c) => c.key === 'npSignOff')) {
      for (const row of out) row.approvedByNp = !!row[signatureFieldKeys('npSignOff').userId];
    }
    return out;
  }

  private registerSignatureStepUpPurpose(
    id: string,
    registerKey: string,
    rowIndex: number,
    column: string,
  ): string {
    return `register_signature:${id}:${registerKey}:${rowIndex}:${column}`;
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
  ): Promise<{ stepUpToken: string }> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const { col, resource, action } = this.registerSignatureColumn(config, column);
    if (!(await this.permissions.hasPermission(user, resource, action))) {
      throw new ForbiddenException(`Your role may not sign "${col.label}" (needs ${col.signCapability})`);
    }
    const signature = await this.prisma.userSignature.findUnique({ where: { userId: user.id } });
    if (!signature) {
      throw new BadRequestException('Save a signature in My Account before signing');
    }
    await this.totp.verifyForStepUp(user.id, code);
    const purpose = this.registerSignatureStepUpPurpose(id, registerKey, rowIndex, column);
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
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const { col, resource, action } = this.registerSignatureColumn(config, column);
    return this.mutate(user, id, expectedVersion, 'register_signature.signed', async (tx, row, project) => {
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
      if (data[keys.userId]) {
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
      const expectedPurpose = this.registerSignatureStepUpPurpose(id, registerKey, rowIndex, column);
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
      if (column === 'npSignOff') data.approvedByNp = true;
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
      if (column === 'npSignOff') data.approvedByNp = false;
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

  private registerClosureRoleKey(config: RegisterConfig, role: RegisterClosureSignOff['role']): string {
    if (!config.reviewOwner) {
      throw new BadRequestException(
        `Register "${config.key}" has no review owner configured — it cannot be closed`,
      );
    }
    // Shared with the frontend closing panel (packages/shared/src/config/reviewers.ts)
    // — never re-derive this independently.
    return registerClosureSignerRole(config.reviewOwner, role);
  }

  // Older projects (created before this feature) never had these rows
  // scaffolded — rather than depend on scaffold timing, find-or-create them
  // here too, the same "additive backfill" pattern seedDemoProject already
  // uses for project_reviewers.
  private async ensureRegisterClosure(tx: Prisma.TransactionClient, projectId: string, registerKey: string) {
    const closure = await tx.registerClosure.upsert({
      where: { projectId_registerKey: { projectId, registerKey } },
      update: {},
      create: { projectId, registerKey },
    });
    for (const role of ['Review owner', 'Co-sign'] as const) {
      await tx.registerClosureSignOff.upsert({
        where: { closureId_role: { closureId: closure.id, role } },
        update: {},
        create: { closureId: closure.id, role },
      });
    }
    return closure;
  }

  private registerCloseStepUpPurpose(id: string, registerKey: string, role: string): string {
    return `register_close:${id}:${registerKey}:${role}`;
  }

  async verifyRegisterCloseStepUp(
    user: SessionUser,
    id: string,
    registerKey: string,
    role: RegisterClosureSignOff['role'],
    code: string,
  ): Promise<{ stepUpToken: string }> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const roleKey = this.registerClosureRoleKey(config, role);
    const reviewer = await this.prisma.projectReviewer.findUnique({
      where: { projectId_roleKey: { projectId: id, roleKey } },
    });
    if (!reviewer || reviewer.name.trim() !== user.displayName.trim()) {
      throw new ForbiddenException(
        `"${role}" for "${registerKey}" is ${reviewer ? `assigned to ${reviewer.name}` : 'not assigned to anyone'} — only that person may sign`,
      );
    }
    const signature = await this.prisma.userSignature.findUnique({ where: { userId: user.id } });
    if (!signature) {
      throw new BadRequestException('Save a signature in My Account before signing');
    }
    await this.totp.verifyForStepUp(user.id, code);
    const purpose = this.registerCloseStepUpPurpose(id, registerKey, role);
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
    role: RegisterClosureSignOff['role'],
    stepUpToken: string,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    const roleKey = this.registerClosureRoleKey(config, role);
    return this.mutate(user, id, expectedVersion, 'register_close.signed', async (tx, row) => {
      const reviewer = await tx.projectReviewer.findUnique({
        where: { projectId_roleKey: { projectId: id, roleKey } },
      });
      if (!reviewer || reviewer.name.trim() !== user.displayName.trim()) {
        throw new ForbiddenException(`"${role}" for "${registerKey}" is assigned to somebody else`);
      }
      const closure = await this.ensureRegisterClosure(tx, id, registerKey);
      const existing = await tx.registerClosureSignOff.findUnique({
        where: { closureId_role: { closureId: closure.id, role } },
      });
      if (existing?.signedAt) {
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
      const expectedPurpose = this.registerCloseStepUpPurpose(id, registerKey, role);
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
        },
      });
      return { registerKey, role, recordVersion: row.version };
    });
  }

  // Only the signer may withdraw their own signature (an admin too, for the
  // case where that account is gone), and a reason is mandatory — B4, no
  // silent corrections. Same rule as withdrawSignOff/withdrawRegisterRowSignature.
  async withdrawRegisterClose(
    user: SessionUser,
    id: string,
    registerKey: string,
    role: RegisterClosureSignOff['role'],
    reason: string,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    const why = reason?.trim();
    if (!why) throw new BadRequestException('A reason is required to withdraw a signature');
    const config = getRegisterConfig(registerKey);
    if (!config) throw new BadRequestException(`Unknown register "${registerKey}"`);
    return this.mutate(user, id, expectedVersion, 'register_close.withdrawn', async (tx) => {
      const closure = await tx.registerClosure.findUnique({ where: { projectId_registerKey: { projectId: id, registerKey } } });
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
        },
      });
      return { registerKey, role, reason: why };
    });
  }

  async setEvidenceItems(
    user: SessionUser,
    id: string,
    items: ProjectData['evidence'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'evidence.updated', async (tx, row) => {
      // Fixed rows seeded from EVIDENCE_AREAS — matched by `area`, never replaced
      // wholesale, so the seeded reference text cannot be overwritten by a client.
      for (const item of items) {
        const target = row.evidenceItems.find((e) => e.area === item.area);
        if (!target) continue;
        await tx.evidenceItem.update({
          where: { id: target.id },
          data: {
            status: item.status,
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
      const active = row.formulaVersions.find((v) => v.status === 'Active') ?? row.formulaVersions.at(-1);
      if (!active) throw new BadRequestException('Project has no formula version to attach BOM lines to');
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
            notes: l.notes ?? null,
          })),
        });
      }
      return { version: active.version, lines: lines.length };
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
      for (const field of ['microSusceptibility', 'microRationale'] as const) {
        if (field in patch) data[field] = (patch[field] ?? '').trim() || null;
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

      // Questions 8 and 11 each attach a condition to one of the answers, and both
      // are enforced here rather than only in the card — BACKEND_PLAN §3 principle
      // 7: the server is the sole authority, and "the UI disables it" is not
      // enforcement. Merged against the stored row, not read from the patch alone,
      // so a partial PUT cannot satisfy a condition by simply omitting the field
      // that fails it.
      const merged = { ...project.assessments, ...patch };
      const value = (k: keyof ProjectData['assessments']) => (merged[k] ?? '').trim();

      // Question 8: "If Yes, a valid Change Control record must be linked. If No,
      // the rationale and reviewer must be recorded."
      if (value('changeControlRequired') === 'Yes' && value('changeControlRecordId') === '') {
        throw new BadRequestException(
          'Change Control required = "Yes" needs a linked Change Control record (Round 4, question 8)',
        );
      }
      if (
        value('changeControlRequired') === 'No' &&
        (value('changeControlRationale') === '' || value('changeControlReviewer') === '')
      ) {
        throw new BadRequestException(
          'Change Control required = "No" needs both the reviewer and the rationale recorded (Round 4, question 8)',
        );
      }
      // Question 11: "The classification must be confirmed by an authorised
      // reviewer." An unconfirmed Yes is not an exemption, so it must not be
      // storable as one — the competitor-review trigger reads both fields.
      if (value('administrativeOnly') === 'Yes' && value('administrativeOnlyConfirmedBy') === '') {
        throw new BadRequestException(
          'An administrative-only classification must name the authorised reviewer who confirmed it (Round 4, question 11)',
        );
      }

      await tx.project.update({ where: { id }, data });
      return { fields: Object.keys(data) };
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
      if (isGateRefLocked(project, '01')) {
        throw new ForbiddenException(
          'Countries / Markets belongs to gate 01, which has passed — it is read-only (use Backtrack to reopen it).',
        );
      }
      const wanted = [...new Set(markets.map((m) => m.trim()).filter((m) => m !== ''))];
      const current = row.markets.map((m) => m.market);
      const removed = current.filter((m) => !wanted.includes(m));
      const added = wanted.filter((m) => !current.includes(m));

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
            !!t.regulatoryNotes,
        );
        if (inUse.length > 0) {
          throw new BadRequestException(
            inUse
              .map(
                (t) =>
                  `Cannot remove "${t.market}": its Market Regulatory & Launch Tracking row has recorded progress — reset that row first`,
              )
              .join('; '),
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
      return { added, removed };
    });
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
    return this.mutate(user, id, expectedVersion, 'next_actions.updated', async (tx) => {
      await tx.nextAction.deleteMany({ where: { projectId: id, gateId: { in: gateIds } } });
      if (actions.length > 0) {
        await tx.nextAction.createMany({
          data: actions.map((a) => ({
            projectId: id,
            gateId: a.gateId,
            description: a.description,
            owner: a.owner ?? null,
            dueDate: this.dateOrNull(a.dueDate),
            status: a.status,
            priority: a.priority,
            dateCompleted: this.dateOrNull(a.dateCompleted),
            raisedBy: a.raisedBy ?? null,
            verifiedBy: a.verifiedBy ?? null,
          })),
        });
      }
      return { gates: gateIds, actions: actions.length };
    });
  }

  // A1/C5: market approvals need `market-track|approve`, and launch approval is
  // hard-blocked until that market's PIF status is Approved — re-enforced here,
  // not trusted from the draft (ported from the store's setMarketTracksBulk).
  async setMarketTracks(
    user: SessionUser,
    id: string,
    tracks: ProjectData['marketTracks'],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    if (!(await this.permissions.canApproveMarketTrack(user))) {
      throw new ForbiddenException('Your role may not change market approvals (needs market-track|approve)');
    }
    return this.mutate(user, id, expectedVersion, 'market_tracks.updated', async (tx, row) => {
      let blocked = 0;
      for (const next of tracks) {
        const prev = row.marketTracks.find((t) => t.market === next.market);
        if (!prev) continue;
        let launchApproval = next.launchApproval;
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
      return { tracks: tracks.length, launchBlockedByPif: blocked };
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
    input: ProjectData['supersessionDecisions'][number] & { confirm?: boolean },
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'supersession.updated', async (tx, row, project) => {
      if (!project.identity.markets.includes(input.market)) {
        throw new BadRequestException(`"${input.market}" is not a market on this project`);
      }
      const version = row.formulaVersions.find((v) => v.version === input.version);
      if (!version) throw new NotFoundException(`Formula version "${input.version}" not found`);
      if (input.version === project.formulaVersion) {
        throw new BadRequestException('The current formula version cannot be superseded — create a new version first');
      }

      const draft = { ...input, confirmedBy: input.confirm ? user.displayName : undefined };
      if (input.confirm) {
        const gaps = supersessionGaps(draft);
        if (gaps.length > 0) {
          throw new BadRequestException(
            `The supersession decision is incomplete — ${gaps.join('; ')}. All ten facts are required before it can be confirmed.`,
          );
        }
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
        // Confirmation is an act with an author and a time — taken from the
        // session, never from the request body, for the same reason a signature is.
        ...(input.confirm ? { confirmedBy: user.displayName, confirmedAt: new Date() } : {}),
      };
      await tx.supersessionDecision.upsert({
        where: { projectId_version_market: { projectId: id, version: input.version, market: input.market } },
        create: { projectId: id, version: input.version, market: input.market, ...data },
        update: data,
      });

      // Re-derive the version's state from the decisions as they now stand.
      const decisions = await tx.supersessionDecision.findMany({
        where: { projectId: id, version: input.version },
      });
      const complete = decisions.filter((d) =>
        supersessionGaps({
          ...d,
          effectiveTransitionDate: d.effectiveTransitionDate?.toISOString().slice(0, 10) ?? '',
          lastReleaseDate: d.lastReleaseDate?.toISOString().slice(0, 10) ?? '',
          replacementVersion: d.replacementVersion ?? '',
          stockDisposition: d.stockDisposition ?? '',
          regulatoryNotificationStatus: d.regulatoryNotificationStatus ?? '',
          artworkTransition: d.artworkTransition ?? '',
          pifUpdate: d.pifUpdate ?? '',
          salesMarketingCommunication: d.salesMarketingCommunication ?? '',
          distributorCommunication: d.distributorCommunication ?? '',
          confirmedBy: d.confirmedBy ?? undefined,
        } as ProjectData['supersessionDecisions'][number]).length === 0,
      );
      const allMarketsDecided =
        project.identity.markets.length > 0 &&
        project.identity.markets.every((m) => complete.some((d) => d.market === m));
      const state = allMarketsDecided ? 'Superseded' : 'Transition in Progress';
      await tx.formulaVersion.update({ where: { id: version.id }, data: { status: state } });

      return {
        version: input.version,
        market: input.market,
        confirmed: !!input.confirm,
        versionState: state,
        marketsRemaining: project.identity.markets.filter((m) => !complete.some((d) => d.market === m)),
      };
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
    return this.mutate(user, id, expectedVersion, 'study_approvals.updated', async (tx, row) => {
      const author = approvals.find((a) => a.role === 'Study Author');
      const independent = approvals.find((a) => a.role === 'Independent Reviewer');
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
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
    return this.mutate(user, id, expectedVersion, 'feedback.updated', async (tx) => {
      await tx.feedbackEntry.deleteMany({ where: { projectId: id } });
      if (entries.length > 0) {
        await tx.feedbackEntry.createMany({
          data: entries.map((f) => ({
            projectId: id,
            testerName: f.testerName,
            gender: f.gender,
            dept: f.dept,
            dateTested: new Date(f.dateTested),
            texture: f.texture,
            fragrance: f.fragrance,
            overall: f.overall,
            tooOilySlippery: f.tooOilySlippery,
            wouldRecommend: f.wouldRecommend,
            bestLiked: f.bestLiked ?? null,
            concerns: f.concerns ?? null,
          })),
        });
      }
      return { entries: entries.length };
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
    },
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<ProjectEnvelope> {
    const scope = 'project.formula_version';
    const replayed = await this.idempotency.replay(scope, idempotencyKey);
    if (replayed) return replayed as ProjectEnvelope;

    const version = input.version.trim();
    if (!version) throw new BadRequestException('A formula version is required');

    const envelope = await this.mutate(
      user,
      id,
      expectedVersion,
      'formula_version.created',
      async (tx, row, project) => {
        if (version === project.formulaVersion) {
          throw new BadRequestException(`Project is already on formula version ${version}`);
        }
        const previous = row.formulaVersions.find((v) => v.status === 'Active') ?? row.formulaVersions.at(-1);

        // Move the outgoing version into TRANSITION, not Superseded. Round 4
        // question 2 (2026-08-29): "an older formula version does not
        // automatically close when the replacement receives launch approval — it
        // must be deliberately transitioned via a per-market supersession
        // decision", and "approval of the new version places the old version into
        // Transition in Progress (not Superseded)". Superseded is reached only
        // through `setSupersessionDecision`, once a person has confirmed the ten
        // facts for every market. Before this the old version closed silently here,
        // and nothing was ever recorded about stock, artwork, notifications or
        // customer communication.
        //
        // The old version KEEPS its BOM lines, which is what makes the
        // version-compare feature work without a snapshot column.
        if (previous) {
          await tx.formulaVersion.update({
            where: { id: previous.id },
            data: { status: 'Transition in Progress' },
          });
        }
        const created = await tx.formulaVersion.create({
          data: {
            projectId: id,
            version,
            previousVersionId: previous?.id,
            changeType: input.changeType,
            reason: input.reason ?? null,
            initiatedBy: input.initiatedBy ?? user.displayName,
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
              notes: l.notes,
            })),
          });
        }
        // Market tracks follow the controlled version (F14/A1).
        await tx.marketTrack.updateMany({ where: { projectId: id }, data: { formulaVersionId: created.id } });

        let reopened: string[] = [];
        if (input.changeType === 'Major') {
          const toIdx = gateIndex('SG04');
          const fromIdx = gateIndex('SG09');
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
              initiatedBy: input.initiatedBy?.trim() || user.displayName,
              reason: `Formula version ${project.formulaVersion} -> ${version} (Major)${input.reason ? ` — ${input.reason}` : ''}`,
              fromGateId: 'SG09',
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
              },
            });
          }
        }

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
        const existingRows = await tx.registerRow.count({
          where: { projectId: id, registerKey: 'formulationChangeRegister' },
        });
        await tx.registerRow.create({
          data: {
            projectId: id,
            registerKey: 'formulationChangeRegister',
            rowOrder: existingRows,
            updatedById: user.id,
            data: {
              changeId: `FC-${String(existingRows + 1).padStart(3, '0')}`,
              productFamilySku: project.identity.productSku,
              requestedByNpd: input.initiatedBy ?? user.displayName,
              dateRequested: new Date().toISOString().slice(0, 10),
              changeTitle: `Formula version ${project.formulaVersion} -> ${version} (${input.changeType})`,
              explanation: input.reason ?? '',
              vnRegistrationRequired:
                input.changeType === 'Major' && project.identity.markets.includes('Vietnam'),
              overallStatus: 'In Progress',
            } as Prisma.InputJsonValue,
          },
        });

        return { version, changeType: input.changeType, reopenedGateIds: reopened };
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
    return this.mutate(user, id, expectedVersion, 'changes.updated', async (tx) => {
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
            owner: c.owner,
            notes: c.notes ?? null,
          })),
        });
      }
      return { records: records.length };
    });
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
    const gapVerdict = gapBlocksDecision(nextGate, requested);
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
    const blockers =
      requested === 'Proceed'
        ? gateBlockers(project, gateId, requested)
        : hardGateBlockers(project, gateId);
    if (blockers.length > 0) {
      return reject(
        `Gate ${gateId}: "${requested}" is not valid yet — ${blockers.map((b) => b.label).join('; ')}`,
      );
    }
    void changes;
    return requested;
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
    // Only a decision change needs the grant — owner/due date/evidence/notes are
    // ordinary contribution, open to any authenticated user (rule A4).
    if ('decision' in patch) await this.assertCanDecide(user, gateId);
    const projectId = await this.prisma.$transaction(async (tx) => {
      const row = await this.loadVersionLocked(tx, id, expectedVersion);
      const project = toProjectData(row, [], await this.loadReference(tx));
      const existing = project.gates.find((g) => g.gateId === gateId);
      if (!existing) throw new NotFoundException(`Gate ${gateId} not found on project ${id}`);
      // B4: only the single gate currently open for work may be edited directly.
      if (!isGateUnlocked(project, gateId)) {
        throw new ForbiddenException(
          `Gate ${gateId} is not the gate currently open for work — correcting a passed gate requires a Backtrack`,
        );
      }

      // Round 4 questions 32(c) / 34(d). Inside the transaction because it reads
      // the project's flagged findings and open changes, which `assertCanDecide`
      // above cannot see — that runs before the row is loaded.
      if ('decision' in patch) {
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
    // Checked BEFORE the transaction and for every row that carries a decision,
    // so a bulk save cannot smuggle one gate's decision past the grant check by
    // burying it among rows the user is allowed to edit.
    for (const update of gates) {
      if ('decision' in update) await this.assertCanDecide(user, update.gateId);
    }
    await this.prisma.$transaction(async (tx) => {
      const row = await this.loadVersionLocked(tx, id, expectedVersion);
      const project = toProjectData(row, [], await this.loadReference(tx));
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
        if ('decision' in update) {
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
      if (wrote) await this.bumpVersion(tx, id);
    });
    return this.envelope(await this.loadOrThrow(this.prisma, id));
  }

  // B4 backtrack, ported 1:1 from useAppStore.backtrackGate: the range INCLUDES
  // fromGateId, every phase with at least one gate in the range loses ALL three
  // sign-offs, and nothing is deleted — the prior gates and sign-offs are
  // snapshotted into an immutable BacktrackEvent first.
  async backtrack(
    user: SessionUser,
    id: string,
    body: { fromGateId: string; toGateId: string; reason: string; initiatedBy?: string },
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<ProjectEnvelope> {
    const actorId = user.id;
    // Backtrack is selected from the same "Gate decision" dropdown in the UI, so
    // it carries the same authority requirement as recording a decision on the
    // gate being backtracked FROM — and it is strictly more destructive (it
    // reopens a whole range and voids sign-offs).
    await this.assertCanDecide(user, body.fromGateId);
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
      const inRange = (gid: string) => {
        const idx = gateIndex(gid);
        return idx >= toIdx && idx <= fromIdx;
      };

      const affected = project.gates.filter((g) => inRange(g.gateId));
      const previousGates = affected.map((g) => ({ ...g }));

      const affectedPhases = new Set<number>();
      for (let idx = toIdx; idx <= fromIdx; idx++) affectedPhases.add(GATES[idx].phase);

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

      const event = await tx.backtrackEvent.create({
        data: {
          projectId: id,
          initiatedBy: body.initiatedBy?.trim() || undefined,
          reason: body.reason.trim(),
          fromGateId: body.fromGateId,
          toGateId: body.toGateId,
          reopenedGateIds: affected.map((g) => g.gateId),
          previousGates: previousGates as unknown as Prisma.InputJsonValue,
          previousSignOffs: previousSignOffs as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.gateRecord.updateMany({
        where: { projectId: id, gateId: { in: affected.map((g) => g.gateId) } },
        data: { status: 'Not Started', decision: null },
      });

      for (const phase of affectedPhases) {
        const closure = row.phaseClosures.find((c) => c.phase === phase);
        if (!closure) continue;
        // Clear the signature fields but keep the rows (one per role) — the
        // previous values live on the immutable event created above.
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

      // Register closing (2026-08-27): a register whose OWN threshold gate
      // (gateRefHighestGateId) falls inside the reopened range must reopen
      // too — otherwise a Backtrack could reopen Gate 5 while a register
      // that had to close BEFORE Gate 5 stays closed, an inconsistency
      // nothing else here would ever produce. Same clear-fields pattern as
      // the phase SignOff clearing above; the previous signatures are not
      // separately snapshotted — unlike phase sign-offs, there is no
      // per-register slot in BacktrackEvent's shape to hold them, and the
      // registerClosureSignOffs the transaction is about to null out are
      // small enough (2 rows per affected register) that adding one is not
      // worth doing until a real need for it shows up.
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
          },
        });
      }

      await this.bumpVersion(tx, id);
      await this.audit.record(
        {
          actorId,
          projectId: id,
          entityType: 'backtrack_event',
          entityId: event.id,
          action: 'project.backtracked',
          before: { previousGates, previousSignOffs } as unknown as Prisma.InputJsonValue,
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
  private assertMutable(row: { id: string; archivedAt: Date | null }): void {
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
    expectedVersion: number,
  ): Promise<ProjectWithAll> {
    await tx.$queryRaw`SELECT id FROM projects WHERE id = ${id} FOR UPDATE`;
    const row = await this.loadOrThrow(tx, id);
    this.assertMutable(row);
    if (Number.isInteger(expectedVersion) && expectedVersion !== row.version) {
      throw new ConflictException({
        message: 'This project was updated by someone else — reload before saving',
        expectedVersion,
        currentVersion: row.version,
      });
    }
    return row;
  }

  private async bumpVersion(tx: Prisma.TransactionClient, id: string): Promise<void> {
    await tx.project.update({ where: { id }, data: { version: { increment: 1 } } });
  }

  private gateWriteData(next: Partial<GateRecord>): Prisma.GateRecordUpdateInput {
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
