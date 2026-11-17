// Auth configuration from environment (see apps/api/.env.example).
//
// Ways in, independent of each other (all can be on at once in dev):
//  - Microsoft 365, through AppHub (2026-11-17): HUB_URL + HUB_APP set ->
//    "Sign in with Microsoft 365" (GET /api/auth/login) sends the browser to
//    {HUB_URL}/launch/{HUB_APP}. AppHub signs the person in with Microsoft (and
//    decides which Microsoft tenants may), then opens MBc360 through the signed
//    hub handshake (hub/hub.controller.ts). MBc360 has no Microsoft sign-in of
//    its own any more and creates no account on the way in: an administrator
//    adds the person in Users & Roles first.
//  - Dev mode: POST /api/auth/dev-login issues a session for a seeded demo
//    user (one of the 13 workbook review owners, …@demo.mbc360.local) or any
//    existing account, without going through Microsoft — useful for
//    exercising different roles locally. On by default outside
//    production; set AUTH_DEV_MODE=false to turn it off in a non-prod
//    environment. Hard-disabled in production with no override — a login
//    backdoor must never exist there.
//
// No sign-in is ever granted a role automatically: the default
// administrator(s) come from PINNED_ADMINS (auth/pinned-admins.ts).
//
// AUTH_TENANT_ID / AUTH_CLIENT_ID / AUTH_CLIENT_SECRET are no longer read here;
// only the mailer still uses them (mailer/mailer-config.ts).

export interface AuthConfig {
  appBaseUrl: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  devMode: boolean;
  /**
   * AppHub address + this app's slug there. Both set: "Sign in with Microsoft 365" goes to {hubUrl}/launch/{hubApp},
   * and Sign out goes to {hubUrl}/logout?app= (every app, AppHub and Microsoft sign out).
   */
  hubUrl?: string;
  hubApp?: string;
}

export function loadAuthConfig(): AuthConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  const devMode = !isProduction && process.env.AUTH_DEV_MODE !== 'false';

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && isProduction) {
    throw new Error('SESSION_SECRET must be set in production');
  }

  return {
    appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:5173',
    sessionSecret: sessionSecret ?? 'dev-only-insecure-session-secret',
    sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 8 * 60 * 60),
    devMode,
    hubUrl: process.env.HUB_URL?.trim().replace(/\/$/, '') || undefined,
    hubApp: process.env.HUB_APP?.trim() || undefined,
  };
}

/** Options of the session cookie — shared by dev-login (auth.controller.ts) and AppHub sign-in (hub.controller.ts). */
export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export const SESSION_COOKIE = 'mbc360_session';
