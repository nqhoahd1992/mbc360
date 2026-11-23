import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Put } from '@nestjs/common';
import type { RestrictedCautionEntry } from '@mbc360/shared/types';
import { RESTRICTED_CAUTION_KINDS } from '@mbc360/shared/types';
import { RESTRICTED_CAUTION_REGULATORY_APPROVAL, RESTRICTED_CAUTION_SAFETY_APPROVAL } from '@mbc360/shared/config/referenceData';
import { restrictedCautionProblems, restrictedCautionStatusOf } from '@mbc360/shared/utils/restrictedCaution';
import { listMessage } from '@mbc360/shared/utils/messageList';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../rbac/permissions.service';
import { ReferenceDataService } from './reference-data.service';
import { ProjectsService } from '../projects/projects.service';
import { readSignal, type ChangeSignalBody } from './change-signal';
import type { RestrictedCautionEntry as Row } from '../generated/prisma/client';

// Round 5 question 16(a): the company's controlled restricted and caution ingredient list. "Regulatory and Safety supply and approve the controlled
// sources and company overlays, with versions and effective dates ... Load only the approved current company list."
//
// READ is open to any signed-in user (every project's Gates 4 and 7 consult it). WRITE needs `reference:restricted-caution|edit` (Regulatory and
// Safety); the approval is two acts by two capabilities, like the Claims Library's, and the status is DERIVED on every write — Approved only with both
// approvals standing, so it can never say Approved with nobody's name against it. Editing what an entry says retracts both approvals (an approval
// stands for the words that were approved). The effect on projects is raised as an impact assessment whenever an entry becomes, stops being, or
// changes while Approved (Round 5 question 1(d)). [ASSUMPTION: R6-Q22]
function toEntry(r: Row & { updatedBy?: { displayName: string } | null }): RestrictedCautionEntry {
  return {
    id: r.id,
    ingredient: r.ingredient,
    ...(r.casNo ? { casNo: r.casNo } : {}),
    kind: r.kind,
    ...(r.condition ? { condition: r.condition } : {}),
    markets: r.markets,
    sourceReference: r.sourceReference,
    version: r.version,
    effectiveFrom: r.effectiveFrom,
    ...(r.effectiveTo ? { effectiveTo: r.effectiveTo } : {}),
    status: r.status as RestrictedCautionEntry['status'],
    ...(r.approvedByRegulatory ? { approvedByRegulatory: r.approvedByRegulatory } : {}),
    ...(r.approvedBySafety ? { approvedBySafety: r.approvedBySafety } : {}),
    revision: r.revision,
    ...(r.updatedBy ? { updatedBy: r.updatedBy.displayName } : {}),
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Controller('reference/restricted-caution')
export class RestrictedCautionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reference: ReferenceDataService,
    private readonly permissions: PermissionsService,
    private readonly projects: ProjectsService,
  ) {}

  private async readAll(): Promise<RestrictedCautionEntry[]> {
    const rows = await this.prisma.restrictedCautionEntry.findMany({
      orderBy: [{ ingredient: 'asc' }, { effectiveFrom: 'desc' }],
      include: { updatedBy: { select: { displayName: true } } },
    });
    return rows.map(toEntry);
  }

  @Get()
  list(): Promise<RestrictedCautionEntry[]> {
    return this.readAll();
  }

  @Get(':id/revisions')
  revisions(@Param('id') id: string) {
    return this.reference.revisions('restricted-caution', id);
  }

  // Create (no id yet: pass "new") or edit. Any change to what the entry says retracts both approvals.
  @Put(':id')
  async save(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { patch: Partial<RestrictedCautionEntry>; reason?: string; signal?: ChangeSignalBody },
  ): Promise<RestrictedCautionEntry[]> {
    await this.reference.assertCanEdit(user, 'restricted-caution');
    const patch = body.patch ?? {};
    if (patch.kind !== undefined && !(RESTRICTED_CAUTION_KINDS as readonly string[]).includes(patch.kind)) {
      throw new BadRequestException(`kind must be one of ${RESTRICTED_CAUTION_KINDS.join(', ')}`);
    }
    await this.prisma.$transaction(async (tx) => {
      const existing = id === 'new' ? null : await tx.restrictedCautionEntry.findUnique({ where: { id } });
      if (id !== 'new' && !existing) throw new BadRequestException(`Entry "${id}" not found`);
      if (existing?.status === 'Withdrawn') throw new BadRequestException('A withdrawn entry cannot be changed — propose a new one');
      const merged = {
        ingredient: (patch.ingredient ?? existing?.ingredient ?? '').trim(),
        casNo: (patch.casNo ?? existing?.casNo ?? '').trim(),
        kind: patch.kind ?? existing?.kind ?? '',
        condition: (patch.condition ?? existing?.condition ?? '').trim(),
        markets: patch.markets ?? existing?.markets ?? [],
        sourceReference: (patch.sourceReference ?? existing?.sourceReference ?? '').trim(),
        version: (patch.version ?? existing?.version ?? '').trim(),
        effectiveFrom: (patch.effectiveFrom ?? existing?.effectiveFrom ?? '').trim(),
        effectiveTo: (patch.effectiveTo ?? existing?.effectiveTo ?? '').trim(),
      };
      const problems = restrictedCautionProblems(merged);
      if (problems.length > 0) throw new BadRequestException(listMessage('The entry still needs:', problems));
      const wasApproved = existing?.status === 'Approved';
      const changed =
        !existing ||
        ['ingredient', 'casNo', 'kind', 'condition', 'sourceReference', 'version', 'effectiveFrom', 'effectiveTo'].some(
          (k) => (merged as unknown as Record<string, string>)[k] !== ((existing as unknown as Record<string, string | null>)[k] ?? ''),
        ) ||
        [...merged.markets].sort().join('|') !== [...(existing?.markets ?? [])].sort().join('|');
      const data = {
        ...merged,
        casNo: merged.casNo || null,
        condition: merged.condition || null,
        effectiveTo: merged.effectiveTo || null,
        // An approval stands for the words that were approved: a change to them retracts both.
        ...(changed ? { approvedByRegulatory: null, approvedByRegulatoryAt: null, approvedBySafety: null, approvedBySafetyAt: null, status: 'Proposed' } : {}),
      };
      const revision = (existing?.revision ?? 0) + 1;
      const row = existing
        ? await tx.restrictedCautionEntry.update({ where: { id }, data: { ...data, revision, updatedById: user.id } })
        : await tx.restrictedCautionEntry.create({ data: { ...data, status: 'Proposed', revision, updatedById: user.id } });
      await this.reference.recordRevision(
        tx,
        user,
        'restricted-caution',
        row.id,
        revision,
        { ...merged, status: row.status },
        body.reason,
        existing ? (changed && wasApproved ? 'Edited — approvals retracted' : 'Edited') : 'Proposed',
      );
      // Leaving Approved is a change for the projects that relied on it.
      if (wasApproved && changed) {
        await this.projects.raiseReferenceSignal(tx, user, {
          dataset: 'restricted-caution',
          entryId: row.id,
          subject: merged.ingredient,
          summary: `${merged.ingredient} (${merged.kind}) was edited on the restricted and caution list and needs approving again`,
          ...readSignal(body.signal),
        });
      }
    });
    return this.readAll();
  }

  // The side travels in the PATH: they are two different authorities and in a body it would be one typo away from the wrong approval.
  @Post(':id/approve/:side')
  async approve(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('side') side: string,
    @Body() body?: { signal?: ChangeSignalBody },
  ): Promise<RestrictedCautionEntry[]> {
    if (side !== 'regulatory' && side !== 'safety') throw new BadRequestException('side must be "regulatory" or "safety"');
    const capability = side === 'regulatory' ? RESTRICTED_CAUTION_REGULATORY_APPROVAL : RESTRICTED_CAUTION_SAFETY_APPROVAL;
    const [resource, action] = capability.split('|');
    if (!(await this.permissions.hasPermission(user, resource, action))) {
      throw new ForbiddenException(`Your role may not record the ${side} approval (needs ${capability})`);
    }
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.restrictedCautionEntry.findUnique({ where: { id } });
      if (!existing) throw new BadRequestException(`Entry "${id}" not found`);
      if (existing.status === 'Withdrawn') throw new BadRequestException('A withdrawn entry cannot be approved — propose a new one');
      const alreadyBy = side === 'regulatory' ? existing.approvedByRegulatory : existing.approvedBySafety;
      if (alreadyBy) throw new BadRequestException(`The ${side} approval is already recorded (${alreadyBy}) for this entry as it stands`);
      const stamps = {
        approvedByRegulatory: side === 'regulatory' ? user.displayName : (existing.approvedByRegulatory ?? undefined),
        approvedBySafety: side === 'safety' ? user.displayName : (existing.approvedBySafety ?? undefined),
      };
      const status = restrictedCautionStatusOf(stamps);
      const revision = existing.revision + 1;
      const now = new Date();
      await tx.restrictedCautionEntry.update({
        where: { id },
        data: {
          ...(side === 'regulatory' ? { approvedByRegulatory: user.displayName, approvedByRegulatoryAt: now } : { approvedBySafety: user.displayName, approvedBySafetyAt: now }),
          status,
          revision,
          updatedById: user.id,
        },
      });
      await this.reference.recordRevision(tx, user, 'restricted-caution', id, revision, { status, side }, undefined, side === 'regulatory' ? 'Regulatory approval' : 'Safety approval');
      // Becoming Approved puts a new restriction in front of every project that uses the ingredient.
      if (status === 'Approved') {
        await this.projects.raiseReferenceSignal(tx, user, {
          dataset: 'restricted-caution',
          entryId: id,
          subject: existing.ingredient,
          summary: `${existing.ingredient} (${existing.kind}) was approved on the restricted and caution list`,
          ...readSignal(body?.signal),
        });
      }
    });
    return this.readAll();
  }

  @Post(':id/withdraw')
  async withdraw(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { reason?: string; signal?: ChangeSignalBody },
  ): Promise<RestrictedCautionEntry[]> {
    await this.reference.assertCanEdit(user, 'restricted-caution');
    const reason = (body?.reason ?? '').trim();
    if (reason === '') throw new BadRequestException('Withdrawing an entry needs its reason');
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.restrictedCautionEntry.findUnique({ where: { id } });
      if (!existing) throw new BadRequestException(`Entry "${id}" not found`);
      if (existing.status === 'Withdrawn') throw new BadRequestException('The entry is already withdrawn');
      const revision = existing.revision + 1;
      await tx.restrictedCautionEntry.update({ where: { id }, data: { status: 'Withdrawn', revision, updatedById: user.id } });
      await this.reference.recordRevision(tx, user, 'restricted-caution', id, revision, { status: 'Withdrawn' }, reason, 'Withdrawn');
      if (existing.status === 'Approved') {
        await this.projects.raiseReferenceSignal(tx, user, {
          dataset: 'restricted-caution',
          entryId: id,
          subject: existing.ingredient,
          summary: `${existing.ingredient} (${existing.kind}) was withdrawn from the restricted and caution list: ${reason}`,
          ...readSignal(body?.signal),
        });
      }
    });
    return this.readAll();
  }
}
