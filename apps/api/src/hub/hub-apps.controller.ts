import { Controller, Get, HttpException, Logger, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { listHubApps, type HubAppEntry } from './hub-connector';

// The AppHub "Apps" menu (AppHub repo: docs/07-apps-menu.md section 2b, docs/01-sso-protocol.md section 7).
// MBc360 (mbcstaging.com) and AppHub (maxbiocare.com) are on different root domains, so the browser cannot send the
// AppHub cookie to the embedded menu — the menu script asks THIS route instead (data-apps="/api/hub-apps",
// apps/web/src/apphub/AppsMenuButton.tsx), and the server asks AppHub, signed with HUB_SECRET.
//   GET /api/hub-apps → 200 {apps} | 401 NO_EMAIL | 403 NO_ACCESS (no AppHub account) | 502 HUB_UNAVAILABLE | 404 (AppHub off)
// Behind the global SessionAuthGuard (not @Public): the email is the session's account as the guard just loaded it from
// the database — never from the query, body or a header. An account with no role / deactivated never gets here (the
// guard's 403), which is fine: it cannot open MBc360, so it never sees the button either.
const CACHE_MS = 60_000; // opening the menu several times within a minute asks AppHub once
const cache = new Map<string, { at: number; apps: HubAppEntry[] }>();

@Controller('hub-apps')
export class HubAppsController {
  private readonly logger = new Logger(HubAppsController.name);

  @Get()
  async list(@CurrentUser() user: SessionUser, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const hubUrl = process.env.HUB_URL?.trim().replace(/\/$/, '');
    const app = process.env.HUB_APP?.trim();
    // During a 2-step secret change AppHub accepts both keys; the new one (HUB_SECRET_NEXT) keeps working after
    // AppHub switches to it, so sign with it when it is set.
    const secret = (process.env.HUB_SECRET_NEXT || process.env.HUB_SECRET)?.trim();
    if (!hubUrl || !app || !secret) throw new HttpException({ error: 'NOT_FOUND' }, 404);
    const email = user?.email?.trim().toLowerCase();
    if (!email) throw new UnauthorizedException({ error: 'NO_EMAIL' });

    const hit = cache.get(email);
    if (hit && Date.now() - hit.at < CACHE_MS) return { apps: hit.apps };

    const result = await listHubApps({
      hubUrl,
      app,
      secret,
      email,
      apiUrl: process.env.HUB_API_URL,
      lanRewrite: process.env.HUB_LAN_REWRITE,
    });
    if (!result.ok) {
      // The reason (UNREACHABLE: TIMEOUT, HTTP_401 INVALID_SIGNATURE, …) goes to the log only, never to the browser.
      if (result.status === 502) this.logger.warn(`hub-apps: AppHub did not answer — ${result.reason}`);
      throw new HttpException({ error: result.status === 403 ? 'NO_ACCESS' : 'HUB_UNAVAILABLE' }, result.status);
    }
    if (cache.size > 500) cache.clear();
    cache.set(email, { at: Date.now(), apps: result.apps });
    return { apps: result.apps };
  }
}
