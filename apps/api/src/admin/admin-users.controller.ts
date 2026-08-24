import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { SSO_ROLES } from '@mbc360/shared/config/roles';
import { TotpService } from '../verification/totp.service';

const SSO_ROLE_KEYS = new Set(SSO_ROLES.map((r) => r.key));

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
    private readonly totp: TotpService,
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
    totp?: { activatedAt: Date | null } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      active: user.active,
      department: user.department?.name ?? null,
      roles: user.roles.map((r) => ({ key: r.role.key, name: r.role.name })),
      // Only an ACTIVATED enrolment counts as having an authenticator — a
      // pending one authorises nothing, so offering to reset it would be
      // offering to undo nothing.
      totpEnrolled: !!user.totp?.activatedAt,
    };
  }

  // Only the F6-confirmed real role list (`SSO_ROLES`) is offered here — the
  // `roles` table also carries the legacy `VIEW_ROLES` demo/"View as"
  // simulator entries (needed for dev-login + the existing gate/phase
  // keyword-match permission grants), which would otherwise show up
  // alongside these as confusing, oddly-labeled duplicates.
  @Get('roles')
  async listRoles(@CurrentUser() currentUser: SessionUser) {
    await this.requireAdmin(currentUser);
    const roles = await this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    return roles.filter((r) => SSO_ROLE_KEYS.has(r.key)).map((r) => ({ key: r.key, name: r.name }));
  }

  @Get('users')
  async listUsers(@CurrentUser() currentUser: SessionUser) {
    await this.requireAdmin(currentUser);
    const users = await this.prisma.user.findMany({
      include: {
        department: true,
        roles: { include: { role: true } },
        totp: { select: { activatedAt: true } },
      },
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
        include: {
          department: true,
          roles: { include: { role: true } },
          totp: { select: { activatedAt: true } },
        },
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
        include: {
          department: true,
          roles: { include: { role: true } },
          totp: { select: { activatedAt: true } },
        },
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

  // Hard delete — reserved for accounts with no historical footprint (never
  // signed anything, edited a register row, uploaded an attachment, or
  // acted in the audit trail). Any of that and the delete is refused: this
  // app's audit/sign-off relations to `User` are optional FKs with no
  // explicit `onDelete` (Prisma default = SetNull), so deleting a user who
  // DOES have history wouldn't remove those records — it would silently
  // blank out "who" on them, which is exactly the "no silent corrections"
  // (B4) principle this app is built around. Deactivate (`active: false`,
  // above) is the right tool for a user who has done real work; this is
  // only for cleaning up an unused/mistaken account (e.g. a demo/test row).
  @Delete('users/:id')
  async deleteUser(@CurrentUser() currentUser: SessionUser, @Param('id') id: string) {
    await this.requireAdmin(currentUser);
    if (id === currentUser.id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new BadRequestException('Unknown user');

    const [auditCount, registerRowCount, attachmentCount, signOffCount] = await Promise.all([
      this.prisma.auditEvent.count({ where: { actorId: id } }),
      this.prisma.registerRow.count({ where: { updatedById: id } }),
      this.prisma.attachment.count({ where: { uploadedById: id } }),
      this.prisma.signOff.count({ where: { signedByUserId: id } }),
    ]);
    const historyCount = auditCount + registerRowCount + attachmentCount + signOffCount;
    if (historyCount > 0) {
      throw new BadRequestException(
        `Cannot delete ${target.email} — it has ${historyCount} historical record(s) (audit trail, register edits, attachments, or sign-offs) attached. Deactivate it instead to preserve the audit trail.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } }); // cascades UserRole rows only
      await this.audit.record(
        {
          actorId: currentUser.id,
          entityType: 'user',
          entityId: id,
          action: 'user.deleted',
          before: { email: target.email, displayName: target.displayName },
        },
        tx,
      );
    });

    return { ok: true };
  }

  // Recovery for a lost or replaced device: without it, a user who cannot
  // produce a code could never attach a signature to a sign-off again. It
  // removes the enrolment only — the user re-enrols themselves in My Account,
  // so an admin never sees or handles anybody's secret. Audited with the
  // admin as actor, so a reset can never be mistaken for the user's own act.
  @Delete('users/:id/totp')
  async resetUserTotp(@CurrentUser() currentUser: SessionUser, @Param('id') id: string) {
    await this.requireAdmin(currentUser);
    return this.totp.resetFor(currentUser, id);
  }
}
