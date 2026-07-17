// Auth configuration from environment (see apps/api/.env.example).
//
// Modes, independent of each other (all can be on at once in dev):
//  - OIDC: AUTH_TENANT_ID + AUTH_CLIENT_ID + AUTH_CLIENT_SECRET set ->
//    Microsoft Entra ID sign-in via the authorization-code + PKCE flow.
//  - Dev mode: POST /api/auth/dev-login issues a session for a seeded demo
//    user (…@demo.mbc360.local, one per role) without going through Microsoft
//    — useful for exercising every role locally. On by default outside
//    production; set AUTH_DEV_MODE=false to turn it off in a non-prod
//    environment. Hard-disabled in production with no override — a login
//    backdoor must never exist there.
//  - Auto-admin (TEMPORARY, dev-phase only): every SSO login with zero roles
//    (new user, or an existing one nobody has assigned a role to yet) is
//    granted the admin role automatically, so testers get full access
//    without a chicken-and-egg "who assigns the first admin" problem. Purely
//    env-controlled, in EVERY environment including production, by explicit
//    request (2026-07-17) — set AUTH_AUTO_ADMIN_ROLE=true to turn it on;
//    off by default everywhere otherwise.
//    ⚠️ Unlike AUTH_DEV_MODE, this has NO automatic production lockout — if
//    this var is ever true on a real deployment with real company SSO,
//    every first-time signed-in user gets full admin. Unset it (or set to
//    anything other than "true") once real per-user role assignment is
//    wanted, and remove this whole mechanism + CLAUDE.md's note about it
//    once it's no longer needed at all.

export interface AuthConfig {
  oidcEnabled: boolean;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
  appBaseUrl: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  devMode: boolean;
  autoAdminRole: boolean;
}

export function loadAuthConfig(): AuthConfig {
  const tenantId = process.env.AUTH_TENANT_ID;
  const clientId = process.env.AUTH_CLIENT_ID;
  const clientSecret = process.env.AUTH_CLIENT_SECRET;
  const oidcEnabled = Boolean(tenantId && clientId && clientSecret);
  const isProduction = process.env.NODE_ENV === 'production';

  const devMode = !isProduction && process.env.AUTH_DEV_MODE !== 'false';
  // Deliberately NOT gated on isProduction — env-controlled in every
  // environment by explicit request, see the doc comment above.
  const autoAdminRole = process.env.AUTH_AUTO_ADMIN_ROLE === 'true';

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && isProduction) {
    throw new Error('SESSION_SECRET must be set in production');
  }

  const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';

  return {
    oidcEnabled,
    tenantId,
    clientId,
    clientSecret,
    // Entra requires an exact match with the registered redirect URI. In dev
    // the callback goes through the Vite proxy so the session cookie is set
    // on the same origin the SPA runs on.
    redirectUri: process.env.AUTH_REDIRECT_URI ?? `${appBaseUrl}/api/auth/callback`,
    appBaseUrl,
    sessionSecret: sessionSecret ?? 'dev-only-insecure-session-secret',
    sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 8 * 60 * 60),
    devMode,
    autoAdminRole,
  };
}

export const SESSION_COOKIE = 'mbc360_session';
// Short-lived cookie carrying the PKCE verifier + state between /auth/login
// and /auth/callback (signed JWT, 10 minutes).
export const OIDC_TRANSIENT_COOKIE = 'mbc360_oidc';
