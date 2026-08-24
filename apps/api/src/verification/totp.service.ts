import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SessionUser } from '../auth/session-user';
import { open, seal } from './secret-box';
import { formatSecretForDisplay, generateSecret, otpauthUri, verifyTotp } from './totp';
import type { UserTotp } from '../generated/prisma/client';

// The name shown in the authenticator app's entry list.
const ISSUER = 'MBc360';
// Brute-force guard: 6 digits over a 3-step window is ~3-in-a-million per
// guess, which only holds while guesses are bounded.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export interface TotpStatus {
  enrolled: boolean;
  activatedAt?: string;
  // An enrolment that was started but never confirmed with a first code. It
  // authorises nothing; surfacing it lets the UI say "finish setting this up"
  // instead of silently offering to start over.
  pending: boolean;
  lockedUntil?: string;
}

export interface TotpEnrollment {
  // For the QR code the authenticator app scans.
  otpauthUri: string;
  // For the "I can't scan it" path — the same secret, grouped in fours.
  secret: string;
}

// Authenticator (TOTP) enrolment and verification.
//
// That a phase sign-off needs a second factor at all is our own reading of
// D1's "authenticated" — the rule lists six fields and says nothing about a
// second factor or a drawn signature: [ASSUMPTION: R5-Q4]
//
// Self-service by construction for everything a user does to their OWN factor
// (every method takes the SessionUser, never a target id) — the one exception
// is `resetFor`, the admin recovery path for a lost device, which is
// deliberately separate and audited under a different action.
@Injectable()
export class TotpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async status(userId: string): Promise<TotpStatus> {
    const row = await this.prisma.userTotp.findUnique({ where: { userId } });
    if (!row) return { enrolled: false, pending: false };
    return {
      enrolled: !!row.activatedAt,
      activatedAt: row.activatedAt?.toISOString(),
      pending: !row.activatedAt,
      lockedUntil: row.lockedUntil && row.lockedUntil > new Date() ? row.lockedUntil.toISOString() : undefined,
    };
  }

  // Step 1 of enrolment: mint a secret and hand back the QR payload. An
  // ACTIVE enrolment is never silently replaced — losing the old factor
  // without proving possession of anything would be a way to swap someone's
  // second factor out from under a hijacked session.
  async beginEnrollment(user: SessionUser): Promise<TotpEnrollment> {
    const existing = await this.prisma.userTotp.findUnique({ where: { userId: user.id } });
    if (existing?.activatedAt) {
      throw new BadRequestException(
        'An authenticator is already set up — remove it first (needs a current code)',
      );
    }
    const secret = generateSecret();
    const secretEnc = seal(secret);
    // A pending (never-activated) enrolment IS replaced: it is an abandoned
    // attempt, so re-scanning simply starts over.
    await this.prisma.userTotp.upsert({
      where: { userId: user.id },
      create: { userId: user.id, secretEnc },
      update: { secretEnc, lastUsedStep: null, failedAttempts: 0, lockedUntil: null },
    });
    return {
      otpauthUri: otpauthUri({ secret, issuer: ISSUER, account: user.email }),
      secret: formatSecretForDisplay(secret),
    };
  }

  // Step 2: proving possession is what turns the row into a usable factor.
  async activate(user: SessionUser, code: string): Promise<TotpStatus> {
    const row = await this.prisma.userTotp.findUnique({ where: { userId: user.id } });
    if (!row) throw new BadRequestException('Start setting up an authenticator first');
    if (row.activatedAt) throw new BadRequestException('This authenticator is already active');
    await this.consumeCode(row, code, { activatedAt: new Date() });
    await this.audit.record({
      actorId: user.id,
      entityType: 'user_totp',
      entityId: user.id,
      action: 'user_totp.activated',
    });
    return this.status(user.id);
  }

  // Removing your own factor requires a current code: otherwise a hijacked
  // session could strip the very control that protects a signature.
  async disable(user: SessionUser, code: string): Promise<TotpStatus> {
    const row = await this.prisma.userTotp.findUnique({ where: { userId: user.id } });
    if (!row) return { enrolled: false, pending: false };
    // A pending enrolment protects nothing, so it can just go.
    if (row.activatedAt) {
      await this.consumeCode(row, code);
    }
    await this.prisma.userTotp.delete({ where: { userId: user.id } });
    await this.audit.record({
      actorId: user.id,
      entityType: 'user_totp',
      entityId: user.id,
      action: 'user_totp.removed',
    });
    return { enrolled: false, pending: false };
  }

  // Recovery for a lost or replaced device — without it, a user who cannot
  // produce a code can never attach a signature again and has no way back.
  // Admin-gated by the CALLER (admin-users.controller.ts), audited with the
  // admin as actor and the affected user as the entity, so a reset never
  // looks like the user's own action.
  async resetFor(actor: SessionUser, targetUserId: string): Promise<TotpStatus> {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Unknown user');
    const row = await this.prisma.userTotp.findUnique({ where: { userId: targetUserId } });
    if (!row) throw new BadRequestException(`${target.displayName} has no authenticator set up`);
    await this.prisma.userTotp.delete({ where: { userId: targetUserId } });
    await this.audit.record({
      actorId: actor.id,
      entityType: 'user_totp',
      entityId: targetUserId,
      action: 'user_totp.reset_by_admin',
      before: { enrolled: !!row.activatedAt },
    });
    return { enrolled: false, pending: false };
  }

  // Used by the sign-off step-up. Throws with a reason the UI can show;
  // returns nothing, because "it did not throw" is the whole result.
  async verifyForStepUp(userId: string, code: string): Promise<void> {
    const row = await this.prisma.userTotp.findUnique({ where: { userId } });
    if (!row?.activatedAt) {
      throw new BadRequestException(
        'Set up an authenticator app in My Account before attaching your signature',
      );
    }
    await this.consumeCode(row, code);
  }

  // The one place a code is checked, so the lockout, the replay guard and the
  // attempt counter cannot be forgotten at one of three call sites.
  private async consumeCode(
    row: UserTotp,
    code: string,
    extraUpdate: { activatedAt?: Date } = {},
  ): Promise<void> {
    if (row.lockedUntil && row.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Too many incorrect codes — try again after ${row.lockedUntil.toISOString().slice(11, 16)} UTC`,
      );
    }
    let secret: string;
    try {
      secret = open(row.secretEnc);
    } catch {
      // Almost always a rotated SESSION_SECRET (see secret-box.ts). Say so
      // rather than reporting a wrong code, which would send the user off
      // checking their phone's clock forever.
      throw new BadRequestException(
        'This authenticator can no longer be read by the server — an administrator must reset it so you can set it up again',
      );
    }
    const step = verifyTotp(secret, code);
    // A code is valid for its whole 30s step, and the ±1 window stretches
    // that to ~90s — so the same code must not be accepted twice.
    if (step === null || (row.lastUsedStep !== null && step <= row.lastUsedStep)) {
      const attempts = row.failedAttempts + 1;
      await this.prisma.userTotp.update({
        where: { id: row.id },
        data: {
          failedAttempts: attempts,
          lockedUntil: attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
        },
      });
      throw new BadRequestException(
        step === null
          ? 'Incorrect code — check the 6 digits currently shown in your authenticator app'
          : 'That code was already used — wait for the next one',
      );
    }
    // Conditional on the step this check READ, so two requests racing with
    // the same code cannot both win: the loser updates 0 rows and is told the
    // code is spent. Cheaper than a SELECT ... FOR UPDATE and equally tight,
    // since `lastUsedStep` only ever moves forward.
    const consumed = await this.prisma.userTotp.updateMany({
      where: { id: row.id, lastUsedStep: row.lastUsedStep },
      data: { lastUsedStep: step, failedAttempts: 0, lockedUntil: null, ...extraUpdate },
    });
    if (consumed.count === 0) {
      throw new BadRequestException('That code was already used — wait for the next one');
    }
  }
}
