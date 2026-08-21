import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { loadAuthConfig } from '../auth/auth-config';
import type { OneTimeCode } from '../generated/prisma/client';

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const REQUEST_COOLDOWN_MS = 30 * 1000; // don't resend within 30s of the last live code
const MAX_ATTEMPTS = 5;

// Generic short-lived one-time-code issuing/confirming, keyed by an arbitrary
// `purpose` string — not sign-off-specific, so it is reusable for any future
// "prove it's really you right now" moment. For this pass it has exactly one
// caller: attaching a saved signature to a phase sign-off
// (ProjectsService.requestSignOffCode/confirmSignOffCode).
@Injectable()
export class OneTimeCodeService {
  // Reuses the session secret as a pepper — no new secret to provision.
  private readonly pepper = loadAuthConfig().sessionSecret;

  constructor(private readonly prisma: PrismaService) {}

  private hash(code: string): string {
    return createHash('sha256').update(`${code}:${this.pepper}`).digest('hex');
  }

  private generateCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private liveCode(userId: string, purpose: string) {
    return this.prisma.oneTimeCode.findFirst({
      where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Issues a new code for (userId, purpose). Returns the PLAINTEXT code —
  // callers must send it (email) and never log it or return it over HTTP.
  // Requesting again within the cooldown of a still-live code is refused
  // rather than silently resending, to bound how many emails one click sends.
  async issue(userId: string, purpose: string): Promise<string> {
    const recent = await this.liveCode(userId, purpose);
    if (recent && Date.now() - recent.createdAt.getTime() < REQUEST_COOLDOWN_MS) {
      throw new BadRequestException('A code was just sent — wait a moment before requesting another');
    }
    const code = this.generateCode();
    await this.prisma.oneTimeCode.create({
      data: {
        userId,
        purpose,
        codeHash: this.hash(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });
    return code;
  }

  // Marks the latest live code for (userId, purpose) consumed if `code`
  // matches, and returns that row. A wrong guess increments `attempts`
  // without consuming the code, up to MAX_ATTEMPTS.
  async confirm(userId: string, purpose: string, code: string): Promise<OneTimeCode> {
    const row = await this.liveCode(userId, purpose);
    if (!row) throw new BadRequestException('No pending verification code — request a new one');
    if (row.attempts >= MAX_ATTEMPTS) {
      throw new ForbiddenException('Too many incorrect attempts — request a new code');
    }
    if (row.codeHash !== this.hash(String(code ?? '').trim())) {
      await this.prisma.oneTimeCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Incorrect code');
    }
    return this.prisma.oneTimeCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  }
}
