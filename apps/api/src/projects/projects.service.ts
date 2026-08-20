import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GATES, GATE_DECISIONS } from '@mbc360/shared/config/gates';
import { getChangeTrigger, isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { getRegisterConfig } from '@mbc360/shared/config/registers';
import { diffGateRecord } from '@mbc360/shared/utils/gateDiff';
import { contradictoryClaimRows, publishedInfoViolations } from '@mbc360/shared/utils/claimEvidence';
import { RM_EVIDENCE_REGISTER, rmEvidenceContradictions } from '@mbc360/shared/utils/rmEvidence';
import { WATCHLIST_REGISTER, brokenNextActionLinks, watchlistLabel } from '@mbc360/shared/utils/watchlistReview';
import {
  VULNERABLE_REGISTER,
  targetUsersPinnedByAssessment,
  vulnerableSaveBlockers,
} from '@mbc360/shared/utils/vulnerableUsers';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import {
  gateBlockers,
  gateIndex,
  hardGateBlockers,
  isGateRefLocked,
  isGateUnlocked,
  phaseCompletionChecklist,
} from '@mbc360/shared/utils/gateProgress';
import type {
  AngleRow,
  ChangeRecord,
  ChecklistItem,
  GateCheck,
  GateRecord,
  ProjectData,
  RegisterRow,
  RequirementItem,
  SignOff,
} from '@mbc360/shared/types';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../rbac/permissions.service';
import type { SessionUser } from '../auth/session-user';
import { IdempotencyService } from './idempotency.service';
import {
  PROJECT_INCLUDE,
  toChangeRecords,
  toGateChangeLog,
  toProjectData,
  type ProjectWithAll,
} from './project-mapper';
import { createProjectWithScaffold, type NewProjectInput } from './project-scaffold';

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
export function syncPublishedInfoDerived(
  project: ProjectData,
  rows: RegisterRow[],
  actorName: string,
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
  ) {}

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
      project: toProjectData(row, toGateChangeLog(events)),
      version: row.version,
      changes: toChangeRecords(row) as ChangeRecord[],
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
      const after = await write(tx, row, toProjectData(row, []));
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

  async signSignOff(
    user: SessionUser,
    id: string,
    phase: number,
    role: SignOff['role'],
    input: { decision?: string; comments?: string },
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
      // D1 asks for "comment where required" without saying when. Read as:
      // anything other than a plain Proceed carries a condition or a reason
      // that must be written down. [ASSUMPTION: R4-Q26]
      // Whether D1's field set applies to the PHASE block at all (it is written
      // for gate sign-off) is [ASSUMPTION: R5-Q2].
      const comments = input.comments?.trim();
      if (decision !== 'Proceed' && !comments) {
        throw new BadRequestException(`A comment is required when the decision is "${decision}"`);
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
        },
      });
      return { phase, role, decision, recordVersion: row.version };
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
          // The assignment survives — the same person is still the nominated
          // signer unless the Lead changes it.
        },
      });
      return { phase, role, reason: why, previousSigner: existing.name ?? null };
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
      if (registerKey === WATCHLIST_REGISTER) {
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
      const rowsToWrite =
        registerKey === 'claimEvidenceTraceability'
          ? snapshotReviewedWording(project, rows)
          : registerKey === 'publishedInfoApproval'
            // displayName, not the user id — every `user`-typed register column
            // stores a display name (see UserSelect), so the exemption declarer
            // renders like every other person field.
            ? syncPublishedInfoDerived(project, rows, user.displayName)
            : rows;
      await tx.registerRow.deleteMany({ where: { projectId: id, registerKey } });
      if (rows.length > 0) {
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
      return { registerKey, rows: rows.length };
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
      await tx.costingInputs.update({ where: { projectId: id }, data: patch });
      return { fields: Object.keys(patch) };
    });
  }

  // Gate 1 opportunity capture (2026-08-09, SME Round 3 B1/B2/B3). The FIRST
  // identity-mutation path in the system: identity was previously write-once at
  // POST /projects and had no update route at all.
  //
  // Only the five Gate-1 free-text fields are writable. The identifying fields
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
        'initialTargetMarkets',
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
          },
        });
      }
      return { tracks: tracks.length, launchBlockedByPif: blocked };
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

        // Supersede the outgoing version and create the new Active one. The old
        // version KEEPS its BOM lines, which is what makes the version-compare
        // feature work without a snapshot column.
        if (previous) {
          await tx.formulaVersion.update({ where: { id: previous.id }, data: { status: 'Superseded' } });
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
        }

        // Formulation Change Register entry (A2).
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
    status: GateRecord['status'],
    openChangeGateNumbers: Set<string>,
    strict: boolean,
  ): GateRecord['decision'] {
    if (requested !== 'Proceed' && requested !== 'Proceed with Conditions') return requested;

    const reject = (reason: string): GateRecord['decision'] => {
      if (strict) throw new BadRequestException(reason);
      return existing.decision;
    };

    if (requested === 'Proceed') {
      // B1: a Gap prevents a normal Proceed.
      if (status === 'Gap') {
        return reject(`Gate ${gateId}: "Proceed" is not valid while the stage status is Gap`);
      }
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
      const project = toProjectData(row, []);
      const existing = project.gates.find((g) => g.gateId === gateId);
      if (!existing) throw new NotFoundException(`Gate ${gateId} not found on project ${id}`);
      // B4: only the single gate currently open for work may be edited directly.
      if (!isGateUnlocked(project, gateId)) {
        throw new ForbiddenException(
          `Gate ${gateId} is not the gate currently open for work — correcting a passed gate requires a Backtrack`,
        );
      }

      const decision = this.resolveDecision(
        project,
        [],
        gateId,
        existing,
        'decision' in patch ? patch.decision : existing.decision,
        patch.status ?? existing.status,
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
      const project = toProjectData(row, []);
      const openChanges = await this.openChangeGateNumbers(tx, id);
      let wrote = false;

      for (const update of gates) {
        const existing = project.gates.find((g) => g.gateId === update.gateId);
        if (!existing || !isGateUnlocked(project, update.gateId)) continue;
        const decision = this.resolveDecision(
          project,
          [],
          update.gateId,
          existing,
          'decision' in update ? update.decision : existing.decision,
          update.status ?? existing.status,
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
      const project = toProjectData(row, []);
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
    return data;
  }
}
