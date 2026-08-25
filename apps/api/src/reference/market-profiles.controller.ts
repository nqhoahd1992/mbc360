import { BadRequestException, Body, Controller, Get, Param, Put } from '@nestjs/common';
import type { MarketProfile } from '@mbc360/shared/config/referenceData';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { PrismaService } from '../prisma/prisma.service';
import { ReferenceDataService } from './reference-data.service';

// Round 4 question 4 (2026-08-24): "Do not use a permanently hard-coded country
// list. Regulatory maintains a configurable market profile indicating whether each
// market requires particular adverse-event reporting, PMS records or review
// intervals."
//
// Built first of the three reference datasets because it is the cheapest and
// unblocks the most: it also supplies question 35(b)'s required dossier type and
// question 27's per-market claim restriction — the second of C1's three conditions
// the app could not evaluate.
//
// The READ is open to any signed-in user: every project consults it. The WRITE
// needs `reference:market-profile|edit`, seeded to Regulatory.
@Controller('reference/market-profiles')
export class MarketProfilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reference: ReferenceDataService,
  ) {}

  @Get()
  async list(): Promise<MarketProfile[]> {
    const rows = await this.prisma.marketProfile.findMany({
      orderBy: { market: 'asc' },
      include: { updatedBy: { select: { displayName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      market: r.market,
      adverseEventReporting: r.adverseEventReporting,
      pmsRecordsRequired: r.pmsRecordsRequired,
      reviewIntervalMonths: r.reviewIntervalMonths ?? undefined,
      enhancedSurveillance: r.enhancedSurveillance,
      dossierType: r.dossierType ?? undefined,
      claimRestrictions: r.claimRestrictions ?? undefined,
      evidenceLink: r.evidenceLink ?? undefined,
      reviewDate: r.reviewDate ?? undefined,
      notes: r.notes ?? undefined,
      revision: r.revision,
      updatedBy: r.updatedBy?.displayName,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  @Get(':market/revisions')
  async revisions(@Param('market') market: string) {
    const row = await this.prisma.marketProfile.findUnique({ where: { market } });
    return row ? this.reference.revisions('market-profile', row.id) : [];
  }

  // Upsert by market name. `market` is the natural key — it is a value from the
  // Target Countries / Markets option list, and there is exactly one profile per
  // market — so there is no separate create step for Regulatory to find.
  @Put(':market')
  async save(
    @CurrentUser() user: SessionUser,
    @Param('market') market: string,
    @Body() body: { patch: Partial<MarketProfile>; reason?: string },
  ): Promise<MarketProfile[]> {
    await this.reference.assertCanEdit(user, 'market-profile');
    const key = market.trim();
    if (key === '') throw new BadRequestException('A market name is required');

    const patch = body.patch ?? {};
    const months = patch.reviewIntervalMonths;
    if (months !== undefined && months !== null && (!Number.isInteger(months) || months < 1 || months > 120)) {
      throw new BadRequestException('Review interval must be a whole number of months between 1 and 120');
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.marketProfile.findUnique({ where: { market: key } });
      const data = {
        adverseEventReporting: patch.adverseEventReporting ?? existing?.adverseEventReporting ?? false,
        pmsRecordsRequired: patch.pmsRecordsRequired ?? existing?.pmsRecordsRequired ?? false,
        // `null` clears the interval back to "use the company default"; `undefined`
        // leaves it alone. The two are different answers and the API must not
        // conflate them.
        reviewIntervalMonths:
          'reviewIntervalMonths' in patch ? (patch.reviewIntervalMonths ?? null) : (existing?.reviewIntervalMonths ?? null),
        enhancedSurveillance: patch.enhancedSurveillance ?? existing?.enhancedSurveillance ?? false,
        dossierType: (patch.dossierType ?? existing?.dossierType ?? '') || null,
        claimRestrictions: (patch.claimRestrictions ?? existing?.claimRestrictions ?? '') || null,
        evidenceLink: (patch.evidenceLink ?? existing?.evidenceLink ?? '') || null,
        reviewDate: (patch.reviewDate ?? existing?.reviewDate ?? '') || null,
        notes: (patch.notes ?? existing?.notes ?? '') || null,
      };
      const revision = (existing?.revision ?? 0) + 1;
      const row = existing
        ? await tx.marketProfile.update({
            where: { market: key },
            data: { ...data, revision, updatedById: user.id },
          })
        : await tx.marketProfile.create({
            data: { market: key, ...data, revision, updatedById: user.id },
          });
      await this.reference.recordRevision(tx, user, 'market-profile', row.id, revision, { market: key, ...data }, body.reason);
    });

    return this.list();
  }
}
