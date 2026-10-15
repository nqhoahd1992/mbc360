import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ADMIN_ROLE } from '@mbc360/shared/config/roles';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

// PINNED_ADMINS (2026-10-04, project owner's request): a comma-separated list
// of email addresses that always hold the System Administrator role.
//
// Why: a fresh deployment had no administrator at all. The seeder creates the
// roles but assigns none, and since "no role, no entry" (2026-10-02) a first
// Microsoft 365 sign-in lands on "no access" with nobody able to grant it. The
// only way round used to be AUTH_AUTO_ADMIN_ROLE=true, which made EVERY
// role-less sign-in an admin; it was removed when this replaced it.
//
// On every API start (which is every deploy) each pinned address is made sure
// to exist, be active and hold the admin role. A missing account is created
// with no Entra id; the first SSO sign-in links it by email
// (AuthService.upsertSsoUser). Because the list is re-applied on every start,
// the Users page refuses to take admin away from, deactivate or delete a pinned
// account — otherwise the change would silently come back at the next deploy.
// To retire one, remove it from PINNED_ADMINS first.

export function pinnedAdminEmails(raw = process.env.PINNED_ADMINS): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)),
    ),
  ];
}

export function isPinnedAdmin(email: string): boolean {
  return pinnedAdminEmails().includes(email.trim().toLowerCase());
}

@Injectable()
export class PinnedAdminsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PinnedAdminsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const raw = process.env.PINNED_ADMINS ?? '';
    const emails = pinnedAdminEmails(raw);
    const rejected = raw.split(/[,;\s]+/).filter((s) => s.trim() && !emails.includes(s.trim().toLowerCase()));
    if (rejected.length) this.logger.warn(`PINNED_ADMINS: ignored entries that are not email addresses: ${rejected.join(', ')}`);
    if (emails.length === 0) return;

    try {
      // The seeder creates this role; upserting it here as well means a first
      // deploy that has not been seeded yet still gets its administrator.
      const adminRole = await this.prisma.role.upsert({
        where: { key: ADMIN_ROLE },
        update: {},
        create: { key: ADMIN_ROLE, name: 'System Administrator' },
      });

      for (const email of emails) {
        await this.prisma.$transaction(async (tx) => {
          const existing = await tx.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            include: { roles: true },
          });
          const changes: string[] = [];
          const user =
            existing ??
            (await tx.user.create({
              // Display name is a placeholder until the first SSO sign-in
              // replaces it with the name from Microsoft 365.
              data: { email, displayName: email.split('@')[0] },
              include: { roles: true },
            }));
          if (!existing) changes.push('created');
          if (!user.active) {
            await tx.user.update({ where: { id: user.id }, data: { active: true } });
            changes.push('reactivated');
          }
          if (!user.roles.some((r) => r.roleId === adminRole.id)) {
            await tx.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });
            changes.push('granted admin');
          }
          if (changes.length === 0) return;
          await this.audit.record(
            {
              entityType: 'user',
              entityId: user.id,
              action: 'user.pinned_admin_applied',
              after: { email: user.email, changes, source: 'PINNED_ADMINS' },
            },
            tx,
          );
          this.logger.log(`PINNED_ADMINS: ${user.email} — ${changes.join(', ')}`);
        });
      }
    } catch (err) {
      // Never stop the API from starting over this: log loudly instead.
      this.logger.error(`PINNED_ADMINS could not be applied: ${(err as Error).message}`);
    }
  }
}
