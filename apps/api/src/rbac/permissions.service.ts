import { Injectable } from '@nestjs/common';
import { ADMIN_ROLE } from '@mbc360/shared/config/roles';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '../auth/session-user';

// RBAC checks against the roles / permissions / role_permissions tables
// (BACKEND_PLAN 4.1). The seed materialises the demo-parity keyword-match
// mapping from @mbc360/shared/config/roles — when follow-up F6 delivers the
// real matrix, only the DATA changes; every caller of this service stays as-is.
//
// Resource / action vocabulary: project-level actions and screens outside a project only (SW-37). Gate decisions, phase
// approvals and market approvals follow the project's assignment (@mbc360/shared/utils/projectAuthority), not this grid.
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

  // Round 4 question 32(c) (2026-08-24): recording Proceed with Conditions serves
  // as the authorised acceptance of a flagged watch-list finding only where "the
  // gate approver has the required Safety **or** Regulatory authority".
  //
  // Either grant satisfies it. The answer names them as alternatives, and which
  // one a given finding needs depends on how it was escalated — which for a row
  // marked "REVIEW - possible formula match" (a status a person chose, naming no function) nobody
  // has decided — settled by SW-32 (`watchlistRequiredAuthority`): the status or the row's Owner names it.
  async canAcceptWatchlistFinding(user: SessionUser, anyOf: ('safety' | 'regulatory')[] = ['safety', 'regulatory']): Promise<boolean> {
    for (const authority of anyOf) {
      if (await this.hasPermission(user, 'watchlist-finding', `accept-${authority}`)) return true;
    }
    return false;
  }

  // Round 4 question 34(d): "Only a person authorised to approve the relevant
  // Gate 11 impact may acknowledge it."
  canAcknowledgeChangeImpact(user: SessionUser): Promise<boolean> {
    return this.hasPermission(user, 'change-impact', 'acknowledge');
  }
}
