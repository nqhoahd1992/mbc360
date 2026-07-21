import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Response shape of POST/PUT https://.../oauth/token per docs/swagger-init.json
// (schemas getAccessTokenRequestPayload / refreshTokenRequestPayload).
interface CosmetriTokenResponse {
  success: boolean;
  message: string;
  data?: {
    access_token: string;
    refresh_token: string;
    // "YYYY-MM-DD HH:mm:ss", no timezone in the spec — treated as UTC.
    access_token_expires_at: string;
    refresh_token_expires_at: string;
  };
}

function parseCosmetriDate(value: string): Date {
  // The API returns "YYYY-MM-DD HH:mm:ss" with no timezone; treat as UTC
  // (documented assumption — adjust if Cosmetri confirms otherwise).
  return new Date(`${value.replace(' ', 'T')}Z`);
}

export interface CosmetriConnectionStatus {
  connected: boolean;
  baseUrl?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  connectedAt?: Date;
  lastRefreshedAt?: Date | null;
  lastRefreshError?: string | null;
}

// Server-side Cosmetri OAuth connection (BACKEND_PLAN section 4.7 / M4
// groundwork). The browser never holds Cosmetri credentials or tokens (A3) —
// an admin pastes an access/refresh token pair obtained out-of-band once;
// CosmetriRefreshJob keeps it alive from then on via grant_type=refresh_token,
// so the password grant is only needed again if the refresh chain lapses
// (refresh_token itself expires, or the job is down for too long).
@Injectable()
export class CosmetriTokenService {
  private readonly logger = new Logger(CosmetriTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Bootstraps (or replaces) the connection. Validates the supplied
  // refresh_token immediately by exchanging it — Cosmetri rotates tokens on
  // every refresh, so this also gives us a canonical, freshly-issued pair
  // with accurate expiry timestamps instead of trusting whatever the admin
  // pasted in (no need to also type expiry dates by hand).
  async connect(input: { baseUrl: string; accessToken: string; refreshToken: string }) {
    const trimmedBaseUrl = input.baseUrl.trim().replace(/\/+$/, '');
    if (!trimmedBaseUrl || !input.accessToken.trim() || !input.refreshToken.trim()) {
      throw new BadRequestException('Base URL, access token and refresh token are all required');
    }

    const fresh = await this.exchangeRefreshToken(trimmedBaseUrl, input.refreshToken.trim());

    await this.prisma.cosmetriConnection.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        baseUrl: trimmedBaseUrl,
        accessToken: fresh.access_token,
        refreshToken: fresh.refresh_token,
        accessTokenExpiresAt: parseCosmetriDate(fresh.access_token_expires_at),
        refreshTokenExpiresAt: parseCosmetriDate(fresh.refresh_token_expires_at),
        lastRefreshedAt: new Date(),
      },
      update: {
        baseUrl: trimmedBaseUrl,
        accessToken: fresh.access_token,
        refreshToken: fresh.refresh_token,
        accessTokenExpiresAt: parseCosmetriDate(fresh.access_token_expires_at),
        refreshTokenExpiresAt: parseCosmetriDate(fresh.refresh_token_expires_at),
        connectedAt: new Date(),
        lastRefreshedAt: new Date(),
        lastRefreshError: null,
      },
    });

    return this.getStatus();
  }

  async disconnect(): Promise<void> {
    await this.prisma.cosmetriConnection.deleteMany({ where: { id: 1 } });
  }

  // Returns the raw stored token pair. SENSITIVE — for the admin-only token
  // inspection surface on the Integrations page. Never call this from the
  // public status path; the controller gates it behind requireAdmin + audit.
  async getSecrets(): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  } | null> {
    const row = await this.prisma.cosmetriConnection.findUnique({ where: { id: 1 } });
    if (!row) return null;
    return {
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      accessTokenExpiresAt: row.accessTokenExpiresAt,
      refreshTokenExpiresAt: row.refreshTokenExpiresAt,
    };
  }

  async getStatus(): Promise<CosmetriConnectionStatus> {
    const row = await this.prisma.cosmetriConnection.findUnique({ where: { id: 1 } });
    if (!row) return { connected: false };
    return {
      connected: true,
      baseUrl: row.baseUrl,
      accessTokenExpiresAt: row.accessTokenExpiresAt,
      refreshTokenExpiresAt: row.refreshTokenExpiresAt,
      connectedAt: row.connectedAt,
      lastRefreshedAt: row.lastRefreshedAt,
      lastRefreshError: row.lastRefreshError,
    };
  }

  // Called by CosmetriRefreshJob (and available for a manual "Refresh now").
  // Swallows errors into lastRefreshError rather than throwing, EXCEPT when
  // called directly from the admin-triggered manual refresh, which re-throws
  // so the caller sees a real error.
  async refresh(options: { throwOnError?: boolean } = {}): Promise<CosmetriConnectionStatus> {
    const row = await this.prisma.cosmetriConnection.findUnique({ where: { id: 1 } });
    if (!row) throw new BadRequestException('Cosmetri is not connected');

    try {
      const fresh = await this.exchangeRefreshToken(row.baseUrl, row.refreshToken);
      await this.prisma.cosmetriConnection.update({
        where: { id: 1 },
        data: {
          accessToken: fresh.access_token,
          refreshToken: fresh.refresh_token,
          accessTokenExpiresAt: parseCosmetriDate(fresh.access_token_expires_at),
          refreshTokenExpiresAt: parseCosmetriDate(fresh.refresh_token_expires_at),
          lastRefreshedAt: new Date(),
          lastRefreshError: null,
        },
      });
      this.logger.log('Cosmetri access token refreshed');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cosmetri token refresh failed: ${message}`);
      await this.prisma.cosmetriConnection.update({
        where: { id: 1 },
        data: { lastRefreshError: message },
      });
      if (options.throwOnError) throw err;
    }
    return this.getStatus();
  }

  // Polled by CosmetriRefreshJob. No-ops quietly when not connected or when
  // the access token still has plenty of life — so the periodic job can run
  // often without hammering Cosmetri on every tick.
  async refreshIfNeeded(bufferMinutes: number): Promise<void> {
    const row = await this.prisma.cosmetriConnection.findUnique({ where: { id: 1 } });
    if (!row) return;
    const expiresInMs = row.accessTokenExpiresAt.getTime() - Date.now();
    if (expiresInMs > bufferMinutes * 60_000) return;
    await this.refresh();
  }

  // For future use by a real Cosmetri API client (M4): returns a valid
  // access token, refreshing first if it's near expiry.
  async getValidAccessToken(bufferMinutes = 5): Promise<string> {
    const row = await this.prisma.cosmetriConnection.findUnique({ where: { id: 1 } });
    if (!row) throw new BadRequestException('Cosmetri is not connected');
    const expiresInMs = row.accessTokenExpiresAt.getTime() - Date.now();
    if (expiresInMs > bufferMinutes * 60_000) return row.accessToken;
    await this.refresh({ throwOnError: true });
    const refreshed = await this.prisma.cosmetriConnection.findUniqueOrThrow({ where: { id: 1 } });
    return refreshed.accessToken;
  }

  private async exchangeRefreshToken(
    baseUrl: string,
    refreshToken: string,
  ): Promise<NonNullable<CosmetriTokenResponse['data']>> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/oauth/token`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      });
    } catch (err) {
      throw new BadRequestException(
        `Could not reach Cosmetri at ${baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const body = (await res.json().catch(() => undefined)) as CosmetriTokenResponse | undefined;
    if (!res.ok || !body?.success || !body.data) {
      throw new BadRequestException(body?.message ?? `Cosmetri token refresh failed (HTTP ${res.status})`);
    }
    return body.data;
  }
}
