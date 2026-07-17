import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OIDC_TRANSIENT_COOKIE, SESSION_COOKIE } from './auth-config';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
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
  async login(@Res() res: Response): Promise<void> {
    const { authorizationUrl, transientJwt } = await this.auth.startLogin();
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
      const session = await this.auth.handleCallback(currentUrl, cookies?.[OIDC_TRANSIENT_COOKIE]);
      res.clearCookie(OIDC_TRANSIENT_COOKIE, { path: '/' });
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

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return this.auth.toMeResponse(user);
  }
}
