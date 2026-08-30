import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Put } from '@nestjs/common';
import type { ClaimLibraryEntry } from '@mbc360/shared/config/referenceData';
import {
  CLAIMS_LIBRARY_REGULATORY_APPROVAL,
  CLAIMS_LIBRARY_TECHNICAL_APPROVAL,
  claimLibraryStatusFor,
} from '@mbc360/shared/config/referenceData';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../rbac/permissions.service';
import { ReferenceDataService } from './reference-data.service';

// Round 4 question 28 (2026-08-24), built 2026-08-30. The company-level Claims
// Library — the third reference dataset and the only one with a workflow.
//
// READ is open to any signed-in user: "Projects read from the library but do not
// directly edit it", so a project has to be able to see it.
//
// Three distinct authorities, which is why this controller has four routes rather
// than the one the other two datasets need:
//   `reference:claims-library|edit`        — write and propose. Marketing/Brand
//                                            hold this: "may propose wording but
//                                            not provide final technical/regulatory
//                                            approval".
//   `claims-library|approve-technical`     — one half of the gate.
//   `claims-library|approve-regulatory`    — the other half. BOTH are required
//                                            before an entry is Approved Library
//                                            Wording, and the status is derived
//                                            from the two stamps, never set.
@Controller('reference/claims-library')
export class ClaimsLibraryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reference: ReferenceDataService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get()
  list(): Promise<ClaimLibraryEntry[]> {
    return this.readAll();
  }

  @Get(':id/revisions')
  revisions(@Param('id') id: string) {
    return this.reference.revisions('claims-library', id);
  }

  // Question 28(5): "Changed or withdrawn library entries should identify all
  // linked claims, SKUs, markets and published materials." Exposed as its own read
  // so the impact can be seen BEFORE withdrawing, not only reported afterwards —
  // an impact assessment you can only run by doing the thing is not one.
  @Get(':id/impact')
  impact(@Param('id') id: string) {
    return this.linkedClaims(id);
  }

  @Put(':id')
  async save(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { patch: Partial<ClaimLibraryEntry>; reason?: string },
  ): Promise<ClaimLibraryEntry[]> {
    await this.reference.assertCanEdit(user, 'claims-library');
    const patch = body.patch ?? {};
    await this.prisma.$transaction(async (tx) => {
      const existing = id === 'new' ? null : await tx.claimLibraryEntry.findUnique({ where: { id } });
      if (id !== 'new' && !existing) throw new BadRequestException(`Claims Library entry "${id}" not found`);
      const wording = (patch.wording ?? existing?.wording ?? '').trim();
      if (wording === '') throw new BadRequestException('Approved wording is required');

      // Editing what an approval covers RETRACTS both approvals. Question 28(3)
      // makes the two-party gate the thing that turns wording into Approved
      // Library Wording; letting the wording change underneath it would leave an
      // approval standing for text nobody approved — the same reasoning as the
      // per-claim revision freeze (questions 26/30b) and the stale gate signature
      // (question 29(1)).
      const wordingChanged = !!existing && existing.wording.trim() !== wording;
      const data = {
        wording,
        claimCategory: (patch.claimCategory ?? existing?.claimCategory ?? '') || null,
        claimRisk: (patch.claimRisk ?? existing?.claimRisk ?? '') || null,
        evidenceRequirement: (patch.evidenceRequirement ?? existing?.evidenceRequirement ?? '') || null,
        brands: (patch.brands ?? existing?.brands ?? '') || null,
        productFamilies: (patch.productFamilies ?? existing?.productFamilies ?? '') || null,
        skus: (patch.skus ?? existing?.skus ?? '') || null,
        markets: (patch.markets ?? existing?.markets ?? '') || null,
        languages: (patch.languages ?? existing?.languages ?? '') || null,
        channels: (patch.channels ?? existing?.channels ?? '') || null,
        audience: (patch.audience ?? existing?.audience ?? '') || null,
        effectiveDate: (patch.effectiveDate ?? existing?.effectiveDate ?? '') || null,
        reviewDate: (patch.reviewDate ?? existing?.reviewDate ?? '') || null,
        notes: (patch.notes ?? existing?.notes ?? '') || null,
        ...(wordingChanged
          ? {
              technicalApprovedBy: null,
              technicalApprovedAt: null,
              regulatoryApprovedBy: null,
              regulatoryApprovedAt: null,
            }
          : {}),
      };
      const stamps = wordingChanged
        ? {}
        : {
            technicalApprovedBy: existing?.technicalApprovedBy ?? undefined,
            regulatoryApprovedBy: existing?.regulatoryApprovedBy ?? undefined,
            withdrawnAt: existing?.withdrawnAt?.toISOString(),
          };
      const status = claimLibraryStatusFor(stamps);
      const revision = (existing?.revision ?? 0) + 1;
      const row = existing
        ? await tx.claimLibraryEntry.update({
            where: { id },
            data: { ...data, status, revision, updatedById: user.id },
          })
        : await tx.claimLibraryEntry.create({
            data: { ...data, status, revision, updatedById: user.id, proposedBy: user.displayName },
          });
      await this.reference.recordRevision(
        tx,
        user,
        'claims-library',
        row.id,
        revision,
        { ...data, status },
        wordingChanged ? `${body.reason ?? 'edited'} (wording changed — both approvals retracted)` : body.reason,
      );
    });
    return this.readAll();
  }

  // Question 28(4): "Project approval must not auto-promote wording. A separate
  // controlled action 'Propose for Claims Library' is required." This route IS
  // that action — deliberately the only way a project's wording enters the
  // library, and nothing in the project sign-off path calls it.
  @Post('propose')
  async propose(
    @CurrentUser() user: SessionUser,
    @Body() body: { wording: string; projectId?: string; claimId?: string; claimCategory?: string; claimRisk?: string },
  ): Promise<ClaimLibraryEntry[]> {
    await this.reference.assertCanEdit(user, 'claims-library');
    const wording = (body.wording ?? '').trim();
    if (wording === '') throw new BadRequestException('Wording is required to propose a library entry');
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.claimLibraryEntry.create({
        data: {
          wording,
          claimCategory: body.claimCategory || null,
          claimRisk: body.claimRisk || null,
          // Proposed, never Approved: the two-party gate is the only route to
          // Approved Library Wording, and a proposal is by definition before it.
          status: 'Proposed',
          proposedBy: user.displayName,
          proposedFromProjectId: body.projectId || null,
          proposedFromClaimId: body.claimId || null,
          revision: 1,
          updatedById: user.id,
        },
      });
      await this.reference.recordRevision(tx, user, 'claims-library', row.id, 1, { wording, status: 'Proposed' }, 'Proposed for Claims Library');
    });
    return this.readAll();
  }

  // One half of question 28(3)'s gate. `side` is in the path because the two are
  // different authorities, not two values of one — a route that took the side in
  // the body would be one typo away from a Technical user recording the Regulatory
  // approval.
  @Post(':id/approve/:side')
  async approve(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('side') side: string,
  ): Promise<ClaimLibraryEntry[]> {
    if (side !== 'technical' && side !== 'regulatory') {
      throw new BadRequestException('side must be "technical" or "regulatory"');
    }
    const capability = side === 'technical' ? CLAIMS_LIBRARY_TECHNICAL_APPROVAL : CLAIMS_LIBRARY_REGULATORY_APPROVAL;
    const [resource, action] = capability.split('|');
    if (!(await this.permissions.hasPermission(user, resource, action))) {
      throw new ForbiddenException(`Your role may not record the ${side} approval (needs ${capability})`);
    }
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.claimLibraryEntry.findUnique({ where: { id } });
      if (!existing) throw new BadRequestException(`Claims Library entry "${id}" not found`);
      if (existing.withdrawnAt) throw new BadRequestException('A withdrawn entry cannot be approved — propose a new one');
      const now = new Date();
      const stamps = {
        technicalApprovedBy: side === 'technical' ? user.displayName : (existing.technicalApprovedBy ?? undefined),
        regulatoryApprovedBy: side === 'regulatory' ? user.displayName : (existing.regulatoryApprovedBy ?? undefined),
      };
      // The same person may hold both capabilities, and the answer names two
      // FUNCTIONS rather than two people — so this does not require two humans,
      // only two recorded acts by whoever holds each authority.
      const status = claimLibraryStatusFor(stamps);
      const revision = existing.revision + 1;
      await tx.claimLibraryEntry.update({
        where: { id },
        data: {
          ...(side === 'technical'
            ? { technicalApprovedBy: user.displayName, technicalApprovedAt: now }
            : { regulatoryApprovedBy: user.displayName, regulatoryApprovedAt: now }),
          status,
          revision,
          updatedById: user.id,
        },
      });
      await this.reference.recordRevision(tx, user, 'claims-library', id, revision, { status, side }, `${side} approval recorded`);
    });
    return this.readAll();
  }

  // Question 28(5). Withdrawal is its own act with a mandatory reason, and it
  // returns the impact list rather than acting on it: "changing/withdrawing must
  // not automatically remove a product from the market unless the change is
  // critical or required by Regulatory" — and who declares a change critical is
  // still open [ASSUMPTION: R5-Q9]. So the cascade IDENTIFIES and FLAGS; it does
  // not decide.
  @Post(':id/withdraw')
  async withdraw(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ): Promise<{ entries: ClaimLibraryEntry[]; impact: LinkedClaim[] }> {
    await this.reference.assertCanEdit(user, 'claims-library');
    const reason = (body.reason ?? '').trim();
    if (reason === '') throw new BadRequestException('A reason is required to withdraw a library entry');
    const impact = await this.linkedClaims(id);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.claimLibraryEntry.findUnique({ where: { id } });
      if (!existing) throw new BadRequestException(`Claims Library entry "${id}" not found`);
      const revision = existing.revision + 1;
      await tx.claimLibraryEntry.update({
        where: { id },
        data: { withdrawnAt: new Date(), withdrawnReason: reason, status: 'Withdrawn', revision, updatedById: user.id },
      });
      await this.reference.recordRevision(
        tx,
        user,
        'claims-library',
        id,
        revision,
        { status: 'Withdrawn', reason, affectedClaims: impact.length },
        reason,
      );
    });
    return { entries: await this.readAll(), impact };
  }

  // Every project claim linked to this entry, with the SKUs and markets that use
  // it — question 28(5)'s "identify all linked claims, SKUs, markets and published
  // materials". Read across projects, because the library is company-level and a
  // withdrawal that only reported its impact on one project would be worse than
  // none.
  private async linkedClaims(entryId: string): Promise<LinkedClaim[]> {
    const rows = await this.prisma.registerRow.findMany({
      where: { registerKey: { in: ['claimEvidenceTraceability', 'skuClaimsPifRegister', 'publishedInfoApproval'] } },
      select: { projectId: true, registerKey: true, data: true },
    });
    const claims = rows.filter(
      (r) => r.registerKey === 'claimEvidenceTraceability' && String((r.data as Record<string, unknown>)?.libraryEntryId ?? '') === entryId,
    );
    const claimIds = new Set(claims.map((c) => String((c.data as Record<string, unknown>).claimId ?? '')).filter(Boolean));
    return claims.map((c) => {
      const data = c.data as Record<string, unknown>;
      const claimId = String(data.claimId ?? '');
      const uses = rows.filter(
        (r) =>
          r.projectId === c.projectId &&
          r.registerKey !== 'claimEvidenceTraceability' &&
          claimIds.has(String((r.data as Record<string, unknown>)?.claimId ?? '')) &&
          String((r.data as Record<string, unknown>)?.claimId ?? '') === claimId,
      );
      return {
        projectId: c.projectId,
        claimId,
        wording: String(data.approvedWording ?? ''),
        status: String(data.status ?? ''),
        skus: [...new Set(uses.map((u) => String((u.data as Record<string, unknown>)?.sku ?? '')).filter(Boolean))],
        markets: [...new Set(uses.map((u) => String((u.data as Record<string, unknown>)?.market ?? '')).filter(Boolean))],
        publishedRecords: uses.filter((u) => u.registerKey === 'publishedInfoApproval').length,
      };
    });
  }

  private async readAll(): Promise<ClaimLibraryEntry[]> {
    const rows = await this.prisma.claimLibraryEntry.findMany({
      orderBy: [{ status: 'asc' }, { wording: 'asc' }],
      include: { updatedBy: { select: { displayName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      wording: r.wording,
      claimCategory: r.claimCategory ?? undefined,
      claimRisk: r.claimRisk ?? undefined,
      evidenceRequirement: r.evidenceRequirement ?? undefined,
      brands: r.brands ?? undefined,
      productFamilies: r.productFamilies ?? undefined,
      skus: r.skus ?? undefined,
      markets: r.markets ?? undefined,
      languages: r.languages ?? undefined,
      channels: r.channels ?? undefined,
      audience: r.audience ?? undefined,
      status: r.status as ClaimLibraryEntry['status'],
      technicalApprovedBy: r.technicalApprovedBy ?? undefined,
      technicalApprovedAt: r.technicalApprovedAt?.toISOString(),
      regulatoryApprovedBy: r.regulatoryApprovedBy ?? undefined,
      regulatoryApprovedAt: r.regulatoryApprovedAt?.toISOString(),
      effectiveDate: r.effectiveDate ?? undefined,
      reviewDate: r.reviewDate ?? undefined,
      withdrawnAt: r.withdrawnAt?.toISOString(),
      withdrawnReason: r.withdrawnReason ?? undefined,
      proposedBy: r.proposedBy ?? undefined,
      proposedFromProjectId: r.proposedFromProjectId ?? undefined,
      proposedFromClaimId: r.proposedFromClaimId ?? undefined,
      notes: r.notes ?? undefined,
      revision: r.revision,
      updatedBy: r.updatedBy?.displayName,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }
}

export interface LinkedClaim {
  projectId: string;
  claimId: string;
  wording: string;
  status: string;
  skus: string[];
  markets: string[];
  publishedRecords: number;
}
