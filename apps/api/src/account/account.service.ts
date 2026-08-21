import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SessionUser } from '../auth/session-user';

// A trimmed, low-resolution drawn signature is a few KB — 150KB comfortably
// covers it while keeping the row small. There is no upload pipeline in this
// codebase to offload a larger file to (see the schema comment on
// UserSignature), so oversized input is rejected outright rather than
// resized.
const MAX_IMAGE_BYTES = 150 * 1024;
const DATA_URL_PREFIX = 'data:image/png;base64,';

export interface SignatureResponse {
  hasSignature: boolean;
  imageData?: string;
  updatedAt?: string;
}

// Self-service only: every method takes the CurrentUser and never a target
// user id, so there is no path by which one user's request can touch
// another's row (a stronger invariant than an admin-check, since it is
// structural). This is the first "edit my own record" endpoint in this
// codebase — apps/api/src/admin/admin-users.controller.ts is entirely
// admin-acting-on-others.
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getSignature(user: SessionUser): Promise<SignatureResponse> {
    const row = await this.prisma.userSignature.findUnique({ where: { userId: user.id } });
    if (!row) return { hasSignature: false };
    return { hasSignature: true, imageData: row.imageData, updatedAt: row.updatedAt.toISOString() };
  }

  private validateImageData(imageData: unknown): string {
    if (typeof imageData !== 'string' || !imageData.startsWith(DATA_URL_PREFIX)) {
      throw new BadRequestException('Signature must be a PNG image (data:image/png;base64,...)');
    }
    const base64 = imageData.slice(DATA_URL_PREFIX.length);
    // Rough byte-size check without a full decode: base64 expands input ~4/3.
    const approxBytes = (base64.length * 3) / 4;
    if (approxBytes > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        'Signature image is too large (max 150KB) — try clearing and drawing a smaller mark',
      );
    }
    return imageData;
  }

  async saveSignature(user: SessionUser, imageData: unknown): Promise<SignatureResponse> {
    const validated = this.validateImageData(imageData);
    await this.prisma.$transaction(async (tx) => {
      await tx.userSignature.upsert({
        where: { userId: user.id },
        create: { userId: user.id, imageData: validated },
        update: { imageData: validated },
      });
      await this.audit.record(
        { actorId: user.id, entityType: 'user_signature', entityId: user.id, action: 'user_signature.saved' },
        tx,
      );
    });
    return this.getSignature(user);
  }

  async deleteSignature(user: SessionUser): Promise<SignatureResponse> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.userSignature.findUnique({ where: { userId: user.id } });
      if (!existing) return;
      await tx.userSignature.delete({ where: { userId: user.id } });
      await this.audit.record(
        { actorId: user.id, entityType: 'user_signature', entityId: user.id, action: 'user_signature.deleted' },
        tx,
      );
    });
    return { hasSignature: false };
  }
}
