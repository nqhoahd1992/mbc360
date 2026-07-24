import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../rbac/permissions.service';
import { ADMIN_ROLE } from '@mbc360/shared/config/roles';

// The role x capability permission grid (F6). "Capabilities" here are the
// app's own permissions rows: gate:SGxx|decide, phase:n|approve,
// market-track|approve. A capability id in the API is `${resource}|${action}`
// (the `|` delimiter keeps the colon inside `resource` — e.g. "gate:SG07" —
// unambiguous).
//
// The READ (`GET /api/rbac/permissions-grid`) is available to any signed-in
// user, because the frontend's "View as" demo simulation consults it for
// EVERY user (not just admins) to decide which gate decisions / phase
// approvals a role may record — it's not sensitive data, just "which role can
// do what". The WRITE (`PUT /api/rbac/roles/:key/permissions`) is admin-only
// and audited — it's the editable surface for F6's role x gate/phase grid,
// seeded initially from the keyword-match defaults in seedRbac().
@Controller('rbac')
export class RolePermissionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  private capabilityId(resource: string, action: string): string {
    return `${resource}|${action}`;
  }

  // Active users for the Create New Project reviewer pickers — readable by any
  // signed-in user (a project can be created by non-admins; the reviewer
  // dropdowns are just a picker over the team, not sensitive). No hard role
  // filter here (per the 2026-07-23 decision): every reviewer field lists all
  // active users with their role shown as a tag, since the 13 workbook review
  // areas don't map 1:1 to the 17 assignable roles.
  @Get('users')
  async users() {
    const users = await this.prisma.user.findMany({
      where: { active: true },
      include: { roles: { include: { role: true } } },
      orderBy: { displayName: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      roleKey: u.roles[0]?.role.key ?? null,
      roleName: u.roles[0]?.role.name ?? null,
    }));
  }

  @Get('permissions-grid')
  async grid() {
    const [permissions, roles] = await Promise.all([
      this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] }),
      this.prisma.role.findMany({
        include: { permissions: { include: { permission: true } } },
      }),
    ]);
    const grants: Record<string, string[]> = {};
    for (const role of roles) {
      grants[role.key] = role.permissions.map((rp) =>
        this.capabilityId(rp.permission.resource, rp.permission.action),
      );
    }
    return {
      permissions: permissions.map((p) => ({
        id: this.capabilityId(p.resource, p.action),
        resource: p.resource,
        action: p.action,
        description: p.description,
      })),
      grants,
    };
  }

  @Put('roles/:key/permissions')
  async setRolePermissions(
    @CurrentUser() currentUser: SessionUser,
    @Param('key') key: string,
    @Body() body: { granted?: string[] },
  ) {
    if (!this.permissions.isAdmin(currentUser)) {
      throw new ForbiddenException('Admin role required');
    }
    if (key === ADMIN_ROLE) {
      // System Administrator is unrestricted by design (PermissionsService
      // short-circuits it), so its grid is meaningless to edit.
      throw new BadRequestException('The System Administrator role is unrestricted and cannot be edited');
    }

    const role = await this.prisma.role.findUnique({ where: { key } });
    if (!role) throw new BadRequestException(`Unknown role key: ${key}`);

    const requested = Array.from(new Set(body.granted ?? []));
    const allPermissions = await this.prisma.permission.findMany();
    const byId = new Map(allPermissions.map((p) => [this.capabilityId(p.resource, p.action), p]));

    const unknown = requested.filter((id) => !byId.has(id));
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown capability id(s): ${unknown.join(', ')}`);
    }
    const targetPermissionIds = requested.map((id) => byId.get(id)!.id);

    const before = await this.prisma.rolePermission.findMany({
      where: { roleId: role.id },
      include: { permission: true },
    });
    const beforeIds = before.map((rp) => this.capabilityId(rp.permission.resource, rp.permission.action));

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (targetPermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: targetPermissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        });
      }
      await this.audit.record(
        {
          actorId: currentUser.id,
          entityType: 'role',
          entityId: role.id,
          action: 'role.permissions_changed',
          before: { key, granted: beforeIds },
          after: { key, granted: requested },
        },
        tx,
      );
    });

    return { key, granted: requested };
  }
}
