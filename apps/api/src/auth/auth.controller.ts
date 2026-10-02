import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OIDC_TRANSIENT_COOKIE, SESSION_COOKIE } from './auth-config';
import { CurrentUser } from './current-user.decorator';
import { AllowWithoutRole, Public } from './public.decorator';
import type { SessionUser } from './session-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private cookieOptions(maxAgeMs: number) {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: maxAgeMs,
    };
  }

  // Browser navigation target ("Sign in with Microsoft" button href).
  @Public()
  @Get('login')
  async login(@Query('prompt') prompt: string | undefined, @Res() res: Response): Promise<void> {
    // `prompt=select_account` (from "Sign in with a different account") makes
    // Microsoft show its account picker instead of silently reusing the account
    // that was just refused. No other value is passed through.
    const { authorizationUrl, transientJwt } = await this.auth.startLogin(prompt === 'select_account');
    res.cookie(OIDC_TRANSIENT_COOKIE, transientJwt, this.cookieOptions(10 * 60 * 1000));
    res.redirect(authorizationUrl);
  }

  @Public()
  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const cookies = req.cookies as Record<string, string> | undefined;
    try {
      // Entra redirects to the exact registered URI; rebuild it and let
      // openid-client validate code/state against the transient cookie.
      const currentUrl = new URL(
        req.originalUrl,
        this.auth.config.redirectUri,
      );
      const result = await this.auth.handleCallback(currentUrl, cookies?.[OIDC_TRANSIENT_COOKIE]);
      res.clearCookie(OIDC_TRANSIENT_COOKIE, { path: '/' });
      // A real company account that may not enter (no role yet, deactivated,
      // or another tenant): no session cookie at all, and the reason goes back
      // to the sign-in screen.
      if ('refused' in result) {
        const as = result.email ? `&as=${encodeURIComponent(result.email)}` : '';
        res.redirect(`${this.auth.config.appBaseUrl}/?auth_error=${result.refused}${as}`);
        return;
      }
      const session = result.session;
      res.cookie(SESSION_COOKIE, session, this.cookieOptions(this.auth.config.sessionTtlSeconds * 1000));
      res.redirect(this.auth.config.appBaseUrl);
    } catch (err) {
      res.clearCookie(OIDC_TRANSIENT_COOKIE, { path: '/' });
      // Never render token errors to the user agent — log and bounce home.
      console.error('OIDC callback failed:', err);
      res.redirect(`${this.auth.config.appBaseUrl}/?auth_error=1`);
    }
  }

  // Dev-mode stand-in while Entra credentials are pending (404 otherwise).
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

  // Clears the local session and, for a real Entra sign-in, also returns the
  // Microsoft RP-Initiated Logout URL so the frontend can send the browser
  // there — otherwise the Entra SSO session stays alive and a subsequent
  // "Sign in with Microsoft" click re-authenticates silently.
  @AllowWithoutRole()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    const redirectUrl = await this.auth.logout(token);
    return { ok: true, redirectUrl };
  }

  // NOT @AllowWithoutRole: a no-role session answering /me would let the app
  // shell think it is signed in. The guard's 403 carries the reason instead.
  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return this.auth.toMeResponse(user);
  }
}
