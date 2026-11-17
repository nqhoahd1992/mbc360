import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthConfig, loadAuthConfig } from './auth-config';
import type { SessionUser } from './session-user';

// Why an account was not let in; travels to the sign-in screen as
// `?auth_error=<value>` (from AppHub sign-in, hub/hub.controller.ts).
export type LoginRefusal = 'no_role' | 'inactive';

// "Sign in with Microsoft 365" goes through AppHub since 2026-11-17
// (auth.controller.ts login): MBc360 has no Microsoft sign-in of its own, so
// nothing here talks to Microsoft and no account is created on the way in —
// an administrator adds the person in Users & Roles (or PINNED_ADMINS) first.
@Injectable()
export class AuthService {
  readonly config: AuthConfig = loadAuthConfig();
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {
    if (this.config.hubUrl && this.config.hubApp) {
      this.logger.log(`Sign in with Microsoft 365 goes through AppHub (${this.config.hubUrl}/launch/${this.config.hubApp})`);
    }
    if (this.config.devMode) {
      this.logger.warn('AUTH DEV MODE is enabled — POST /api/auth/dev-login issues sessions without SSO');
    }
  }

  /** Why this account may not enter (no role / deactivated), or undefined. Also used by AppHub sign-in (hub/hub.controller.ts). */
  async loginRefusal(userId: string): Promise<LoginRefusal | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { active: true, _count: { select: { roles: true } } },
    });
    if (!user || !user.active) return 'inactive';
    if (user._count.roles === 0) return 'no_role';
    return undefined;
  }

  // Dev-mode stand-in for local testing: issues a session for an existing
  // (seeded) user. Disabled unless config.devMode.
  async devLogin(email: string): Promise<string> {
    if (!this.config.devMode) {
      throw new NotFoundException(); // hide the endpoint entirely outside dev mode
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) throw new BadRequestException('Unknown or inactive user');
    // Same access rule as a sign-in from AppHub, so dev-login cannot be used to
    // look around as an account that could not otherwise enter.
    if (await this.loginRefusal(user.id)) throw new ForbiddenException('No role has been assigned to this account yet');

    await this.audit.record({
      actorId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'auth.login',
      after: { method: 'dev-login', email: user.email },
    });
    return this.issueSession(user.id);
  }

  /**
   * Session for a sign-in from AppHub (hub/hub.controller.ts) — also where "Sign in with Microsoft 365" ends up. `hiat`
   * keeps AppHub's clock time of the sign-in: AppHub's revoke `at` is AppHub time too (session-auth.guard.ts).
   */
  async hubSession(userId: string, email: string, hubIssuedAt: Date): Promise<string> {
    await this.audit.record({ actorId: userId, entityType: 'user', entityId: userId, action: 'auth.login', after: { method: 'apphub', email } });
    return this.jwt.signAsync({ sub: userId, hiat: Math.floor(hubIssuedAt.getTime() / 1000) }, { expiresIn: this.config.sessionTtlSeconds });
  }

  private issueSession(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId }, { expiresIn: this.config.sessionTtlSeconds });
  }

  // Where the browser goes after the controller cleared the local session.
  // Connected to AppHub: sign out through it — AppHub revokes this person's session in every app, ends its own
  // session and (with AppHub's ENTRA_SIGN_OUT on) the Microsoft one; signing in there again comes back to MBc360
  // (AppHub docs/07-apps-menu.md section 2c, docs/01 section 4). Otherwise (dev): just the app's own base URL.
  logout(): string {
    if (this.config.hubUrl && this.config.hubApp) {
      return `${this.config.hubUrl}/logout?${new URLSearchParams({ app: this.config.hubApp })}`;
    }
    return this.config.appBaseUrl;
  }

  // Shape returned by GET /api/auth/me — what the frontend needs to replace
  // the "View as" simulation: identity + department + role keys.
  toMeResponse(user: SessionUser) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      department: user.department?.name ?? null,
      roles: user.roles.map((r) => ({ key: r.role.key, name: r.role.name })),
    };
  }
}
