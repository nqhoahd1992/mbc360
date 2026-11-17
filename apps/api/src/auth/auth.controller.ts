import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE, sessionCookieOptions } from './auth-config';
import { CurrentUser } from './current-user.decorator';
import { AllowWithoutRole, Public } from './public.decorator';
import type { SessionUser } from './session-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private cookieOptions(maxAgeMs: number) {
    return sessionCookieOptions(maxAgeMs);
  }

  // What the sign-in screen shows: the "Sign in with Microsoft 365" button only
  // while AppHub is configured (HUB_URL + HUB_APP), since that is where it goes.
  @Public()
  @Get('options')
  options() {
    const { hubUrl, hubApp } = this.auth.config;
    return { microsoft: !!(hubUrl && hubApp) };
  }

  // Browser navigation target ("Sign in with Microsoft 365" button href).
  // "Sign in with Microsoft" goes through AppHub (2026-11-17, AppHub repo
  // docs/10-ai-microsoft-via-hub.md): {HUB_URL}/launch/{HUB_APP} — already
  // signed in to AppHub → straight into MBc360; otherwise Microsoft first, then
  // MBc360, through the signed hub handshake (hub/hub.controller.ts). An email
  // MBc360 does not know lands on /?hub_error=no_account and nothing is
  // created. 404 while AppHub is not configured — there is no Microsoft
  // sign-in of MBc360's own to fall back to.
  // The sign-in screen comes here on its own (2026-11-17, AppHub repo
  // docs/11-ai-remove-password-login.md) with `?next=<the page being opened>`:
  // passed on as {HUB_URL}/launch/{HUB_APP}?next=, AppHub hands it back through
  // the handshake and the person lands on that page. Only an in-app path is
  // passed on ("/" first, not "//" or "/\"); anything else, and "/", is dropped.
  @Public()
  @Get('login')
  login(@Res() res: Response, @Query('next') next?: string): void {
    const { hubUrl, hubApp } = this.auth.config;
    if (!hubUrl || !hubApp) throw new NotFoundException();
    const safeNext = typeof next === 'string' && /^\/(?![/\\])/.test(next) && next !== '/' ? next : null;
    res.redirect(`${hubUrl}/launch/${encodeURIComponent(hubApp)}${safeNext ? `?${new URLSearchParams({ next: safeNext })}` : ''}`);
  }

  // Dev-mode stand-in for local testing (404 otherwise).
  @Public()
  @Post('dev-login')
  async devLogin(
    @Body() body: { email?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.devLogin(body?.email ?? '');
    res.cookie(SESSION_COOKIE, session, this.cookieOptions(this.auth.config.sessionTtlSeconds * 1000));
    return { ok: true };
  }

  // Clears the local session and returns where the browser goes next:
  // connected to AppHub, {HUB_URL}/logout?app= (AppHub signs the person out of
  // every app, of itself and of Microsoft); otherwise the app's own base URL.
  @AllowWithoutRole()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    const redirectUrl = this.auth.logout();
    return { ok: true, redirectUrl };
  }

  // NOT @AllowWithoutRole: a no-role session answering /me would let the app
  // shell think it is signed in. The guard's 403 carries the reason instead.
  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return this.auth.toMeResponse(user);
  }
}
