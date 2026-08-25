import { ForbiddenException, Injectable } from '@nestjs/common';
import type { ReferenceDataset } from '@mbc360/shared/config/referenceData';
import { referenceEditCapability } from '@mbc360/shared/config/referenceData';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../rbac/permissions.service';
import type { SessionUser } from '../auth/session-user';

// The thin shared foundation for company-level reference data (Round 4 questions
// 4, 17 and 28 — 2026-08-24).
//
// Three datasets need the same four things, and this is the one place they live:
//
//   1. a role-gated write — question 4 gives market profiles to Regulatory,
//      question 17 gives the risk overlay to Technical / Safety / Regulatory, and
//      question 28 gives the Claims Library a two-party gate. Different
//      authorities, one mechanism: a capability per dataset;
//   2. an append-only revision history — question 17 says "retain revision
//      history", question 28 lists "Revision · Approval history";
//   3. an audit row in the SAME transaction as the write, matching every other
//      mutation in this app (BACKEND_PLAN principle 1);
//   4. a monotonic revision number on the entry itself, so a project reading the
//      entry knows which revision it read — question 28 has the SKU register
//      inherit "Current revision" from a claim.
//
// What is deliberately NOT here: workflow. Only the Claims Library has a
// two-party approval gate and a withdrawal cascade, and pushing those into a
// generic base would mean the other two carry machinery they never use. This is a
// foundation, not a framework.
@Injectable()
export class ReferenceDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  // Reads are open to any signed-in user, deliberately. Every project has to
  // consult these lists — question 28: "Projects read from the library but do not
  // directly edit it" — so gating the read would break the projects that depend on
  // it. Only the write is restricted.
  async assertCanEdit(user: SessionUser, dataset: ReferenceDataset): Promise<void> {
    const [resource, action] = referenceEditCapability(dataset).split('|');
    if (!(await this.permissions.hasPermission(user, resource, action))) {
      throw new ForbiddenException(
        `Your role may not edit the ${dataset} reference data (needs ${referenceEditCapability(dataset)})`,
      );
    }
  }

  // Record one revision. Called INSIDE the caller's transaction so the entry write,
  // its revision row and its audit row commit together — a changed rule with no
  // record of who changed it must not be possible, which is the whole reason this
  // data is controlled rather than just editable.
  async recordRevision(
    tx: Prisma.TransactionClient,
    user: SessionUser,
    dataset: ReferenceDataset,
    entryId: string,
    revision: number,
    snapshot: Prisma.InputJsonValue,
    reason?: string,
  ): Promise<void> {
    await tx.referenceRevision.create({
      data: { dataset, entryId, revision, snapshot, reason, changedById: user.id },
    });
    await this.audit.record(
      {
        actorId: user.id,
        entityType: `reference:${dataset}`,
        entityId: entryId,
        action: `reference.${dataset}.updated`,
        after: snapshot,
      },
      tx,
    );
  }

  // Revision history for one entry, newest first — the "retain revision history"
  // half of questions 17 and 28 made visible rather than merely stored.
  async revisions(dataset: ReferenceDataset, entryId: string) {
    const rows = await this.prisma.referenceRevision.findMany({
      where: { dataset, entryId },
      orderBy: { revision: 'desc' },
      include: { changedBy: { select: { displayName: true } } },
    });
    return rows.map((r) => ({
      revision: r.revision,
      reason: r.reason ?? undefined,
      changedBy: r.changedBy?.displayName,
      changedAt: r.changedAt.toISOString(),
    }));
  }
}
