import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SESSION_COOKIE, loadAuthConfig, sessionCookieOptions } from '../auth/auth-config';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { createHubConnector } from './hub-connector';

// Sign-in from AppHub (AppHub repo: docs/01-sso-protocol.md, docs/05-child-app-onboarding.md).
//   POST /api/hub/sso    AppHub server → signed request with the user's email → one-time code
//   GET  /api/hub/login  browser brings ?code=…&next=… → the same session cookie as a Microsoft sign-in
//   POST /api/hub/revoke AppHub server → signed {email, at} on sign-out / user turned off in AppHub → every session of
//                        that email issued before `at` is refused (users.sessionsValidAfter, auth/session-auth.guard.ts)
// MBc360's own access rule still decides who enters (2026-10-02: active account holding a role):
//  - email unknown here → no account is created; the sign-in screen says so (?hub_error=no_account) and
//    "Sign in with Microsoft 365" creates the account for an administrator to give a role, as before;
//  - known but no role / deactivated → the usual ?auth_error=no_role|inactive notice, no session.
// Sign out goes to {HUB_URL}/sign-out-apps?app={HUB_APP} (auth.service.ts logout): every app signs out, AppHub stays.
@Public()
@Controller('hub')
export class HubController {
  private readonly hub = createHubConnector<{ id: string; email: string }, Request, Response>({
    // During a secret change in AppHub: HUB_SECRET_NEXT = new key, HUB_SECRET = old key (both accepted).
    secret: [process.env.HUB_SECRET_NEXT, process.env.HUB_SECRET].filter((s): s is string => !!s),
    // No HUB_SECRET → the hub endpoints answer 404 and the app still boots.
    enabled: !!(process.env.HUB_SECRET_NEXT || process.env.HUB_SECRET),
    findUserByEmail: (email) =>
      this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, email: true } }),
    // Role and active state are checked in redirectAfterLogin, so the person gets MBc360's own notice.
    isActive: () => true,
    noAccessToLoginPage: true,
    createSession: (_user, _req, res, info) => {
      res.locals.hubIssuedAt = info.issuedAt;
    },
    redirectAfterLogin: async (user, next, _req, res) => {
      const base = this.auth.config.appBaseUrl;
      const refused = await this.auth.loginRefusal(user.id);
      if (refused) return `${base}/?auth_error=${refused}&as=${encodeURIComponent(user.email)}`;
      const session = await this.auth.hubSession(user.id, user.email, res.locals.hubIssuedAt as Date);
      res.cookie(SESSION_COOKIE, session, sessionCookieOptions(this.auth.config.sessionTtlSeconds * 1000));
      return `${base}${next ?? '/'}`;
    },
    // Read from env directly: field initializers run before the constructor's parameters are assigned.
    loginPageUrl: `${loadAuthConfig().appBaseUrl}/`,
    // Only moves forward: a late retry of an older revoke must not let earlier sessions back in.
    revokeSessions: async (email, at) => {
      await this.prisma.user.updateMany({
        where: { email: { equals: email, mode: 'insensitive' }, OR: [{ sessionsValidAfter: null }, { sessionsValidAfter: { lt: at } }] },
        data: { sessionsValidAfter: at },
      });
    },
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Post('sso')
  sso(@Req() req: Request, @Res() res: Response) {
    return this.hub.sso(req, res);
  }

  @Get('login')
  login(@Req() req: Request, @Res() res: Response) {
    return this.hub.login(req, res);
  }

  @Post('revoke')
  revoke(@Req() req: Request, @Res() res: Response) {
    return this.hub.revoke(req, res);
  }
}
