import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GATES } from '@mbc360/shared/config/gates';
import { getChangeTrigger, isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { diffGateRecord } from '@mbc360/shared/utils/gateDiff';
import {
  gateBlockers,
  gateIndex,
  hardGateBlockers,
  isGateUnlocked,
} from '@mbc360/shared/utils/gateProgress';
import type { GateRecord, ProjectData, SignOff } from '@mbc360/shared/types';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdempotencyService } from './idempotency.service';
import { PROJECT_INCLUDE, toGateChangeLog, toProjectData, type ProjectWithAll } from './project-mapper';
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
}

// What every read/write returns: the full ProjectData plus the version the
// client must echo back on its next write.
export interface ProjectEnvelope {
  project: ProjectData;
  version: number;
}

const GATE_ENTITY = 'gate_record';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  // ---------------------------------------------------------------- reads ----

  async list(): Promise<ProjectListItem[]> {
    const rows = await this.prisma.project.findMany({
      include: { markets: { orderBy: { market: 'asc' } } },
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
    return { project: toProjectData(row, toGateChangeLog(events)), version: row.version };
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

  async remove(actorId: string, id: string): Promise<void> {
    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Project ${id} not found`);
    await this.prisma.$transaction(async (tx) => {
      // Audit first: the row (and its cascade) is about to disappear, so the
      // "before" snapshot has to be written while it still exists.
      await this.audit.record(
        {
          actorId,
          entityType: 'project',
          entityId: id,
          action: 'project.deleted',
          before: { productCode: row.productCode, productSku: row.productSku },
        },
        tx,
      );
      await tx.project.delete({ where: { id } });
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
    actorId: string,
    id: string,
    gateId: string,
    patch: Partial<GateRecord>,
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
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
    actorId: string,
    id: string,
    gates: (Partial<GateRecord> & { gateId: string })[],
    expectedVersion: number,
  ): Promise<ProjectEnvelope> {
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
    actorId: string,
    id: string,
    body: { fromGateId: string; toGateId: string; reason: string; initiatedBy?: string },
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<ProjectEnvelope> {
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
          name: s.name ?? undefined,
          initials: s.initials ?? undefined,
          date: s.date ? s.date.toISOString().slice(0, 10) : undefined,
          decision: (s.decision ?? undefined) as SignOff['decision'],
          comments: s.comments ?? undefined,
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

  // Reads the project FOR UPDATE (row lock) and rejects a stale writer, so the
  // guard evaluation below cannot be based on data another request is changing.
  private async loadVersionLocked(
    tx: Prisma.TransactionClient,
    id: string,
    expectedVersion: number,
  ): Promise<ProjectWithAll> {
    await tx.$queryRaw`SELECT id FROM projects WHERE id = ${id} FOR UPDATE`;
    const row = await this.loadOrThrow(tx, id);
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
