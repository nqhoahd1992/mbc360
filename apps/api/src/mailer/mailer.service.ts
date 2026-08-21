import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { loadMailerConfig, type MailerConfig } from './mailer-config';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
// Refresh once fewer than 2 minutes of the app-only token's life remain,
// same "buffer before expiry" idea as CosmetriTokenService.getValidAccessToken.
const TOKEN_REFRESH_BUFFER_MS = 2 * 60_000;

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

interface GraphTokenResponse {
  access_token?: string;
  expires_in?: number;
  error_description?: string;
}

// Sends the signature step-up verification code via Microsoft Graph's
// application-permission sendMail (Mail.Send) — the OAuth2 client-credentials
// grant against the SAME Entra ID app registration used for SSO, sending
// from a real M365 mailbox (mailer-config.ts). The access token is cached
// in memory for its ~1h lifetime and only re-acquired near expiry; there is
// no DB row for it (unlike CosmetriConnection) since it's stateless and
// cheap to refetch on the next send if this process restarts.
//
// Never echoes the code back in any HTTP response — the console-log
// fallback below exists purely for local development when Graph mail isn't
// configured yet (see mailer-config.ts).
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly config: MailerConfig = loadMailerConfig();
  private cachedToken?: CachedToken;

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
      return this.cachedToken.accessToken;
    }
    let res: Response;
    try {
      res = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId ?? '',
          client_secret: this.config.clientSecret ?? '',
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      });
    } catch (err) {
      throw new BadRequestException(
        `Could not reach Microsoft Entra ID: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const json = (await res.json().catch(() => undefined)) as GraphTokenResponse | undefined;
    if (!res.ok || !json?.access_token) {
      throw new BadRequestException(
        json?.error_description ?? `Failed to acquire a Graph access token (HTTP ${res.status})`,
      );
    }
    this.cachedToken = {
      accessToken: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return this.cachedToken.accessToken;
  }

  async sendCode(to: string, code: string): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn(`Graph mail not configured — verification code for ${to} = ${code}`);
      return;
    }
    const accessToken = await this.getAccessToken();
    const res = await fetch(
      `${GRAPH_BASE}/users/${encodeURIComponent(this.config.senderMailbox ?? '')}/sendMail`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: {
            subject: 'Your MBc360 verification code',
            body: {
              contentType: 'Text',
              content: `Your verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
            },
            toRecipients: [{ emailAddress: { address: to } }],
          },
          saveToSentItems: false,
        }),
      },
    );
    if (!res.ok) {
      const errBody = (await res.json().catch(() => undefined)) as
        | { error?: { message?: string } }
        | undefined;
      throw new BadRequestException(
        errBody?.error?.message ?? `Failed to send verification email (HTTP ${res.status})`,
      );
    }
  }
}
