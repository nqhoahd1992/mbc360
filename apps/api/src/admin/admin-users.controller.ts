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

// User & role management (the user's role is a decision made INSIDE MBc360,
// never inferred from Graph/AD attributes — an SSO login only creates the
// user record with no role; an admin assigns it here). Admin-only: every
// handler checks PermissionsService.isAdmin before touching data.
@Controller('admin')
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  private async requireAdmin(user: SessionUser): Promise<void> {
    if (!this.permissions.isAdmin(user)) {
      throw new ForbiddenException('Admin role required');
    }
  }

  private toUserResponse(user: {
    id: string;
    email: string;
    displayName: string;
    active: boolean;
    department: { name: string } | null;
    roles: { role: { key: string; name: string } }[];
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      active: user.active,
      department: user.department?.name ?? null,
      roles: user.roles.map((r) => ({ key: r.role.key, name: r.role.name })),
    };
  }

  @Get('roles')
  async listRoles(@CurrentUser() currentUser: SessionUser) {
    await this.requireAdmin(currentUser);
    const roles = await this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    return roles.map((r) => ({ key: r.key, name: r.name }));
  }

  @Get('users')
  async listUsers(@CurrentUser() currentUser: SessionUser) {
    await this.requireAdmin(currentUser);
    const users = await this.prisma.user.findMany({
      include: { department: true, roles: { include: { role: true } } },
      orderBy: { email: 'asc' },
    });
    return users.map((u) => this.toUserResponse(u));
  }

  // Single role per user, matching the "View as" simulation this replaces:
  // roleKey: null clears every role (contributor-only — can add evidence but
  // cannot decide/approve/sign anything, per rule A4).
  @Put('users/:id/role')
  async setUserRole(
    @CurrentUser() currentUser: SessionUser,
    @Param('id') id: string,
    @Body() body: { roleKey?: string | null },
  ) {
    await this.requireAdmin(currentUser);

    const target = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!target) throw new BadRequestException('Unknown user');

    const roleKey = body.roleKey ?? null;
    let role: { id: string; key: string; name: string } | null = null;
    if (roleKey) {
      role = await this.prisma.role.findUnique({ where: { key: roleKey } });
      if (!role) throw new BadRequestException(`Unknown role key: ${roleKey}`);
    }

    const before = target.roles.map((r) => r.role.key);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (role) {
        await tx.userRole.create({ data: { userId: id, roleId: role.id } });
      }
      const record = await tx.user.findUniqueOrThrow({
        where: { id },
        include: { department: true, roles: { include: { role: true } } },
      });
      await this.audit.record(
        {
          actorId: currentUser.id,
          entityType: 'user',
          entityId: id,
          action: 'user.role_changed',
          before: { roles: before },
          after: { roles: roleKey ? [roleKey] : [] },
        },
        tx,
      );
      return record;
    });

    return this.toUserResponse(updated);
  }

  @Put('users/:id/active')
  async setUserActive(
    @CurrentUser() currentUser: SessionUser,
    @Param('id') id: string,
    @Body() body: { active?: boolean },
  ) {
    await this.requireAdmin(currentUser);
    if (typeof body.active !== 'boolean') {
      throw new BadRequestException('active must be a boolean');
    }
    if (id === currentUser.id && !body.active) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new BadRequestException('Unknown user');

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { id },
        data: { active: body.active },
        include: { department: true, roles: { include: { role: true } } },
      });
      await this.audit.record(
        {
          actorId: currentUser.id,
          entityType: 'user',
          entityId: id,
          action: 'user.active_changed',
          before: { active: target.active },
          after: { active: body.active },
        },
        tx,
      );
      return record;
    });

    return this.toUserResponse(updated);
  }
}
