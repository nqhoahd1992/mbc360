import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../rbac/permissions.service';
import { ADMIN_ROLE, SSO_ROLES } from '@mbc360/shared/config/roles';
import { TotpService } from '../verification/totp.service';
import { isPinnedAdmin } from '../auth/pinned-admins';

const SSO_ROLE_KEYS = new Set(SSO_ROLES.map((r) => r.key));

// Same shape PINNED_ADMINS accepts, for the same reason: the address is what
// links this record to the person's Microsoft 365 account on their first
// sign-in, so anything that is not an address is a record nobody can ever use.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
      // Listed in PINNED_ADMINS: always admin, re-applied on every deploy, so
      // the page shows why its role, Active switch and Delete are locked.
      pinned: isPinnedAdmin(user.email),
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

  // Pre-provision a colleague before their first sign-in. Nothing here grants
  // a way IN: the person still signs in with Microsoft 365, and
  // AuthService.upsertSsoUser links that login to this record by email
  // (case-insensitively), exactly as it does for a PINNED_ADMINS account. What
  // it buys is the order: without it a new starter must sign in, be refused for
  // having no role, and only then appear in this list to be given one.
  //
  // `oid` is deliberately left empty — the Entra object id is the person's to
  // present, not an administrator's to type — and so is the department, which
  // is synced from Microsoft Graph at that first sign-in. The display name is a
  // placeholder until then, same as PINNED_ADMINS.
  @Post('users')
  async createUser(
    @CurrentUser() currentUser: SessionUser,
    @Body() body: { email?: string; displayName?: string; roleKeys?: string[] },
  ) {
    await this.requireAdmin(currentUser);

    const email = (body.email ?? '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email address is required');
    }
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(
        `${existing.email} already exists — search for it in the list instead (it may be inactive).`,
      );
    }

    const roleKeys = [...new Set((body.roleKeys ?? []).map((k) => String(k).trim()).filter(Boolean))];
    const roles = await this.prisma.role.findMany({ where: { key: { in: roleKeys } } });
    const unknown = roleKeys.filter((k) => !roles.some((r) => r.key === k));
    if (unknown.length > 0) throw new BadRequestException(`Unknown role key: ${unknown.join(', ')}`);

    const displayName = (body.displayName ?? '').trim() || email.split('@')[0];

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, displayName } });
      // Sequential: one transaction is one pg connection.
      for (const role of roles) {
        await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
      }
      const record = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
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
          entityId: user.id,
          action: 'user.created',
          after: { email, displayName, roles: roleKeys },
        },
        tx,
      );
      return record;
    });

    return this.toUserResponse(created);
  }

  // A user may hold SEVERAL roles (2026-10-05, project owner). The database has
  // always allowed it — `user_roles` is a join table — and PermissionsService
  // already matches on `roleId: { in: ... }`, so authorisation needed no change.
  // What was single was this endpoint and the Users page.
  //
  // Why it matters here: the 13 workbook review areas do not map one-to-one onto
  // the 17 assignable roles, and a critical gate needs somebody who represents a
  // particular function (question 29(4)). In a small team one person genuinely
  // is both, say, Quality Reviewer and Regulatory Reviewer, and forcing a choice
  // meant one of those gates could not be signed at all.
  //
  // An empty array clears every role. Since 2026-10-02 that locks the account
  // out ("no role, no entry"), which is the intended way to suspend access
  // without deactivating the record.
  @Put('users/:id/roles')
  async setUserRoles(
    @CurrentUser() currentUser: SessionUser,
    @Param('id') id: string,
    @Body() body: { roleKeys?: string[] },
  ) {
    await this.requireAdmin(currentUser);

    const target = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!target) throw new BadRequestException('Unknown user');

    if (!Array.isArray(body.roleKeys)) throw new BadRequestException('roleKeys must be an array');
    const roleKeys = [...new Set(body.roleKeys.map((k) => String(k).trim()).filter(Boolean))];

    // A pinned admin's roles are re-applied on every deploy, so dropping admin
    // here would quietly come back. Other roles may be added alongside it.
    if (isPinnedAdmin(target.email) && !roleKeys.includes(ADMIN_ROLE)) {
      throw new BadRequestException(
        `${target.email} is listed in PINNED_ADMINS and always holds the System Administrator role. Remove it from PINNED_ADMINS first.`,
      );
    }
    const roles = await this.prisma.role.findMany({ where: { key: { in: roleKeys } } });
    const unknown = roleKeys.filter((k) => !roles.some((r) => r.key === k));
    if (unknown.length > 0) throw new BadRequestException(`Unknown role key: ${unknown.join(', ')}`);

    const before = target.roles.map((r) => r.role.key);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      // Sequential, not Promise.all: one transaction is one pg connection.
      for (const role of roles) {
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
          after: { roles: roleKeys },
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
    if (isPinnedAdmin(target.email) && body.active === false) {
      throw new BadRequestException(
        `${target.email} is listed in PINNED_ADMINS, so it cannot be deactivated or deleted here. Remove it from PINNED_ADMINS first.`,
      );
    }

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
  // acted in the audit trail) and not nominated to sign anything either. Any of that and the delete is refused: this
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
    if (isPinnedAdmin(target.email)) {
      throw new BadRequestException(
        `${target.email} is listed in PINNED_ADMINS, so it cannot be deactivated or deleted here. Remove it from PINNED_ADMINS first.`,
      );
    }

    // Every signature-bearing table, not just the phase sign-off this list
    // started with (2026-07-23): the per-gate sign-off and the register closure
    // sign-off both arrived later carrying their own signedByUserId, and until
    // now were caught only by the audit counter standing in for them.
    const [auditCount, registerRowCount, attachmentCount, signOffCount, gateSignOffCount, closureSignOffCount] =
      await Promise.all([
        this.prisma.auditEvent.count({ where: { actorId: id } }),
        this.prisma.registerRow.count({ where: { updatedById: id } }),
        this.prisma.attachment.count({ where: { uploadedById: id } }),
        this.prisma.signOff.count({ where: { signedByUserId: id } }),
        this.prisma.gateSignOff.count({ where: { signedByUserId: id } }),
        this.prisma.registerClosureSignOff.count({ where: { signedByUserId: id } }),
      ]);
    const historyCount =
      auditCount + registerRowCount + attachmentCount + signOffCount + gateSignOffCount + closureSignOffCount;
    if (historyCount > 0) {
      throw new BadRequestException(
        `Cannot delete ${target.email} — it has ${historyCount} historical record(s) (audit trail, register edits, attachments, or sign-offs) attached. Deactivate it instead to preserve the audit trail.`,
      );
    }

    // Nominated to sign but has not signed yet: they have created nothing, so
    // the rule above lets the delete through — and the nomination would be
    // silently blanked (assignedToUserId is SetNull like the rest), leaving a
    // sign-off row nobody is named on and no record that anybody ever was.
    // Replacing a nominated signer is the project lead's decision, not a
    // side effect of tidying up the user list.
    const [phaseNominations, gateNominations] = await Promise.all([
      this.prisma.signOff.count({ where: { assignedToUserId: id } }),
      this.prisma.gateSignOff.count({ where: { assignedToUserId: id } }),
    ]);
    const nominationCount = phaseNominations + gateNominations;
    if (nominationCount > 0) {
      throw new BadRequestException(
        `Cannot delete ${target.email} — they are nominated to sign ${nominationCount} sign-off(s) that nobody has signed yet. Have the project lead nominate someone else first, or deactivate this account instead.`,
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
