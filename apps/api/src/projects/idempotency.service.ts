import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Replay protection for POST "action" endpoints (BACKEND_PLAN §3 principle 9).
// The client generates one key per user INTENT — e.g. when the Backtrack modal
// opens, kept across a retry after a network error — so a double-clicked or
// retried request replays the first response instead of creating a second
// project / backtrack event.
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  requireKey(header: string | undefined): string {
    const key = header?.trim();
    if (!key) {
      throw new BadRequestException(
        'Idempotency-Key header is required for this endpoint (see BACKEND_PLAN §3 principle 9)',
      );
    }
    if (key.length > 200) throw new BadRequestException('Idempotency-Key is too long');
    return key;
  }

  // The stored response for a key already seen, or null on first use.
  async replay(scope: string, key: string): Promise<unknown | null> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { scope_key: { scope, key } },
    });
    return existing ? existing.response : null;
  }

  // Recorded inside the caller's transaction so the key and the work it
  // protects commit together: a committed side effect whose key was not stored
  // would be replayable, which is exactly what this table prevents.
  async remember(
    tx: Prisma.TransactionClient,
    scope: string,
    key: string,
    statusCode: number,
    response: Prisma.InputJsonValue,
  ): Promise<void> {
    await tx.idempotencyKey.create({ data: { scope, key, statusCode, response } });
  }
}
