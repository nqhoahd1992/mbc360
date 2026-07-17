import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as oidc from 'openid-client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthConfig, loadAuthConfig } from './auth-config';
import type { SessionUser } from './session-user';

// Transient payload carried between /auth/login and /auth/callback in a
// short-lived signed cookie (PKCE code verifier + CSRF state).
interface OidcTransient {
  cv: string; // PKCE code verifier
  st: string; // state
}

const GRAPH_ME_URL =
  'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,department';

@Injectable()
export class AuthService {
  readonly config: AuthConfig = loadAuthConfig();
  private readonly logger = new Logger(AuthService.name);
  private oidcConfig?: oidc.Configuration;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {
    if (this.config.oidcEnabled) {
      this.logger.log('Microsoft Entra ID sign-in enabled');
    }
    if (this.config.devMode) {
      this.logger.warn('AUTH DEV MODE is enabled — POST /api/auth/dev-login issues sessions without SSO');
    }
  }

  private async getOidcConfig(): Promise<oidc.Configuration> {
    if (!this.config.oidcEnabled) {
      throw new ServiceUnavailableException(
        'Microsoft Entra ID sign-in is not configured (AUTH_TENANT_ID / AUTH_CLIENT_ID / AUTH_CLIENT_SECRET)',
      );
    }
    if (!this.oidcConfig) {
      this.oidcConfig = await oidc.discovery(
        new URL(`https://login.microsoftonline.com/${this.config.tenantId}/v2.0`),
        this.config.clientId!,
        this.config.clientSecret!,
      );
    }
    return this.oidcConfig;
  }

  // Step 1 of the code flow: build the Entra authorization URL plus the signed
  // transient (PKCE verifier + state) the callback needs to finish the exchange.
  async startLogin(): Promise<{ authorizationUrl: string; transientJwt: string }> {
    const config = await this.getOidcConfig();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();

    const authorizationUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: this.config.redirectUri,
      // User.Read lets us fetch the department from Microsoft Graph — the AD
      // source BACKEND_PLAN section 2 names for user + department.
      scope: 'openid profile email User.Read',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    }).href;

    const transientJwt = await this.jwt.signAsync(
      { cv: codeVerifier, st: state } satisfies OidcTransient,
      { expiresIn: '10m' },
    );
    return { authorizationUrl, transientJwt };
  }

  // Step 2: exchange the code, sync the user (+ department from Graph) and
  // issue the session cookie value.
  async handleCallback(currentUrl: URL, transientJwt: string | undefined): Promise<string> {
    if (!transientJwt) throw new BadRequestException('Missing login transient — restart sign-in');
    let transient: OidcTransient;
    try {
      transient = await this.jwt.verifyAsync<OidcTransient>(transientJwt);
    } catch {
      throw new BadRequestException('Login attempt expired — restart sign-in');
    }

    const config = await this.getOidcConfig();
    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: transient.cv,
      expectedState: transient.st,
    });

    const claims = tokens.claims();
    if (!claims?.sub) throw new BadRequestException('Token response carried no claims');
    const oid = (claims['oid'] as string | undefined) ?? claims.sub;
    const email = (claims['email'] ?? claims['preferred_username']) as string | undefined;
    const displayName = (claims['name'] as string | undefined) ?? email ?? oid;
    if (!email) throw new BadRequestException('Entra ID token carried no email/preferred_username');

    const department = await this.fetchDepartment(tokens.access_token);
    const user = await this.upsertSsoUser({ oid, email, displayName, department });

    await this.audit.record({
      actorId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'auth.login',
      after: { method: 'entra-id', email: user.email },
    });

    return this.issueSession(user.id);
  }

  private async fetchDepartment(accessToken: string): Promise<string | undefined> {
    try {
      const res = await fetch(GRAPH_ME_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        this.logger.warn(`Graph /me returned ${res.status} — department not synced`);
        return undefined;
      }
      const body = (await res.json()) as { department?: string | null };
      return body.department ?? undefined;
    } catch (err) {
      this.logger.warn(`Graph /me failed (${String(err)}) — department not synced`);
      return undefined;
    }
  }

  // Match by Entra object id first, then by email (links pre-provisioned
  // users to their SSO identity on first login), else create. New SSO users
  // start with no roles: they can contribute evidence but cannot decide,
  // approve or sign until an admin assigns a role (A4; real matrix = F6).
  private async upsertSsoUser(input: {
    oid: string;
    email: string;
    displayName: string;
    department?: string;
  }) {
    const departmentRef = input.department
      ? {
          connectOrCreate: {
            where: { name: input.department },
            create: { name: input.department },
          },
        }
      : undefined;

    const existing =
      (await this.prisma.user.findUnique({ where: { oid: input.oid } })) ??
      (await this.prisma.user.findUnique({ where: { email: input.email } }));

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          oid: input.oid,
          email: input.email,
          displayName: input.displayName,
          ...(departmentRef ? { department: departmentRef } : {}),
        },
      });
    }
    return this.prisma.user.create({
      data: {
        oid: input.oid,
        email: input.email,
        displayName: input.displayName,
        ...(departmentRef ? { department: departmentRef } : {}),
      },
    });
  }

  // Dev-mode stand-in while the Entra app registration is pending: issues a
  // session for an existing (seeded) user. Disabled unless config.devMode.
  async devLogin(email: string): Promise<string> {
    if (!this.config.devMode) {
      throw new NotFoundException(); // hide the endpoint entirely outside dev mode
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) throw new BadRequestException('Unknown or inactive user');

    await this.audit.record({
      actorId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'auth.login',
      after: { method: 'dev-login', email: user.email },
    });
    return this.issueSession(user.id);
  }

  private issueSession(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId }, { expiresIn: this.config.sessionTtlSeconds });
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
