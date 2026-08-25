import { Injectable } from '@nestjs/common';
import { ADMIN_ROLE } from '@mbc360/shared/config/roles';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '../auth/session-user';

// RBAC checks against the roles / permissions / role_permissions tables
// (BACKEND_PLAN 4.1). The seed materialises the demo-parity keyword-match
// mapping from @mbc360/shared/config/roles — when follow-up F6 delivers the
// real matrix, only the DATA changes; every caller of this service stays as-is.
//
// Resource / action vocabulary (mirrors apps/web "View as" restrictions):
//   gate:SG01..SG12 x decide   — record the gate decision (rule B1/A4)
//   phase:1..4      x approve  — sign the phase "Approved by" row (rule B3)
//   market-track    x approve  — market PIF/regulatory/launch approvals (A1/C5)
// Contributing evidence needs no permission row — any authenticated active
// user may contribute (A4: "anyone may contribute evidence").
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  isAdmin(user: SessionUser): boolean {
    return user.roles.some((r) => r.role.key === ADMIN_ROLE);
  }

  async hasPermission(user: SessionUser, resource: string, action: string): Promise<boolean> {
    if (!user.active) return false;
    if (this.isAdmin(user)) return true;
    const roleIds = user.roles.map((r) => r.roleId);
    if (roleIds.length === 0) return false;
    const match = await this.prisma.rolePermission.findFirst({
      where: {
        roleId: { in: roleIds },
        permission: { resource, action },
      },
      select: { roleId: true },
    });
    return match !== null;
  }

  canDecideGate(user: SessionUser, gateId: string): Promise<boolean> {
    return this.hasPermission(user, `gate:${gateId}`, 'decide');
  }

  canApprovePhase(user: SessionUser, phase: number): Promise<boolean> {
    return this.hasPermission(user, `phase:${phase}`, 'approve');
  }

  canApproveMarketTrack(user: SessionUser): Promise<boolean> {
    return this.hasPermission(user, 'market-track', 'approve');
  }

  // Round 4 question 32(c) (2026-08-24): recording Proceed with Conditions serves
  // as the authorised acceptance of a flagged watch-list finding only where "the
  // gate approver has the required Safety **or** Regulatory authority".
  //
  // Either grant satisfies it. The answer names them as alternatives, and which
  // one a given finding needs depends on how it was escalated — which for a row
  // flagged by the automated screen ("REVIEW - possible formula match") nobody
  // has decided [ASSUMPTION: R5-Q14].
  async canAcceptWatchlistFinding(user: SessionUser): Promise<boolean> {
    if (await this.hasPermission(user, 'watchlist-finding', 'accept-safety')) return true;
    return this.hasPermission(user, 'watchlist-finding', 'accept-regulatory');
  }

  // Round 4 question 34(d): "Only a person authorised to approve the relevant
  // Gate 11 impact may acknowledge it."
  canAcknowledgeChangeImpact(user: SessionUser): Promise<boolean> {
    return this.hasPermission(user, 'change-impact', 'acknowledge');
  }
}
