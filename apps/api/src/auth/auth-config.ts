// Auth configuration from environment (see apps/api/.env.example).
//
// Two modes:
//  - OIDC (production): AUTH_TENANT_ID + AUTH_CLIENT_ID + AUTH_CLIENT_SECRET
//    set -> Microsoft Entra ID sign-in via the authorization-code + PKCE flow.
//  - Dev mode (no tenant credentials yet): POST /api/auth/dev-login issues a
//    session for a seeded demo user. Never enabled when NODE_ENV=production
//    unless AUTH_DEV_MODE=true is set explicitly.

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
}

export function loadAuthConfig(): AuthConfig {
  const tenantId = process.env.AUTH_TENANT_ID;
  const clientId = process.env.AUTH_CLIENT_ID;
  const clientSecret = process.env.AUTH_CLIENT_SECRET;
  const oidcEnabled = Boolean(tenantId && clientId && clientSecret);
  const isProduction = process.env.NODE_ENV === 'production';

  const devMode =
    process.env.AUTH_DEV_MODE === 'true' || (!oidcEnabled && !isProduction);

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
  };
}

export const SESSION_COOKIE = 'mbc360_session';
// Short-lived cookie carrying the PKCE verifier + state between /auth/login
// and /auth/callback (signed JWT, 10 minutes).
export const OIDC_TRANSIENT_COOKIE = 'mbc360_oidc';
