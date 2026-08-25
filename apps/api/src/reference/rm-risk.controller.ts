import { BadRequestException, Body, Controller, Get, Param, Put } from '@nestjs/common';
import type { RawMaterialRisk } from '@mbc360/shared/config/referenceData';
import { RM_RISK_FLAGS } from '@mbc360/shared/config/referenceData';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { PrismaService } from '../prisma/prisma.service';
import { ReferenceDataService } from './reference-data.service';

// Round 4 question 17 (2026-08-24): the shared Raw Material Risk Overlay.
//
// Second of the three reference datasets. Unblocks the Gate 4 allergen / impurity
// trigger, which until now had no trigger at all — one of the three Conditional
// items that could never hard-block whatever the project contained.
//
// READ is open to any signed-in user: every project's Gate 4 screen consults it.
// WRITE needs `reference:rm-risk|edit`, seeded to Safety, R&I/Formulation and
// Regulatory — the three functions question 17 names.
@Controller('reference/rm-risk')
export class RmRiskController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reference: ReferenceDataService,
  ) {}

  @Get()
  async list(): Promise<RawMaterialRisk[]> {
    const rows = await this.prisma.rawMaterialRisk.findMany({
      orderBy: { rmCode: 'asc' },
      include: { updatedBy: { select: { displayName: true } } },
    });
    return rows.map((r) => ({
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
    }));
  }

  @Get(':rmCode/revisions')
  async revisions(@Param('rmCode') rmCode: string) {
    const row = await this.prisma.rawMaterialRisk.findUnique({ where: { rmCode } });
    return row ? this.reference.revisions('rm-risk', row.id) : [];
  }

  @Put(':rmCode')
  async save(
    @CurrentUser() user: SessionUser,
    @Param('rmCode') rmCode: string,
    @Body() body: { patch: Partial<RawMaterialRisk>; reason?: string },
  ): Promise<RawMaterialRisk[]> {
    await this.reference.assertCanEdit(user, 'rm-risk');
    const key = rmCode.trim();
    if (key === '') throw new BadRequestException('A raw-material code is required');

    const patch = body.patch ?? {};
    // Validated against the shared list rather than a DB enum, matching this
    // schema's stated convention for every dropdown-valued column. An unknown flag
    // would silently never match the Gate 4 trigger, which is the same class of
    // failure sweep S1 catches in readiness config.
    const flags = patch.flags;
    if (flags) {
      const unknown = flags.filter((f) => !(RM_RISK_FLAGS as readonly string[]).includes(f));
      if (unknown.length > 0) {
        throw new BadRequestException(`Unknown risk classification(s): ${unknown.join(', ')}`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.rawMaterialRisk.findUnique({ where: { rmCode: key } });
      const data = {
        displayName: (patch.displayName ?? existing?.displayName ?? '') || null,
        flags: flags ?? existing?.flags ?? [],
        evidenceLink: (patch.evidenceLink ?? existing?.evidenceLink ?? '') || null,
        reviewDate: (patch.reviewDate ?? existing?.reviewDate ?? '') || null,
        notes: (patch.notes ?? existing?.notes ?? '') || null,
      };
      const revision = (existing?.revision ?? 0) + 1;
      const row = existing
        ? await tx.rawMaterialRisk.update({
            where: { rmCode: key },
            data: { ...data, revision, updatedById: user.id },
          })
        : await tx.rawMaterialRisk.create({
            data: { rmCode: key, ...data, revision, updatedById: user.id },
          });
      await this.reference.recordRevision(tx, user, 'rm-risk', row.id, revision, { rmCode: key, ...data }, body.reason);
    });

    return this.list();
  }
}
