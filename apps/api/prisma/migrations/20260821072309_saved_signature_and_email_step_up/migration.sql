-- My Account > Signature + email step-up at phase sign-off (2026-08-21).
-- Additive-only, nothing backfilled.
--
-- user_signatures: a user's saved handwritten signature (drawn via a canvas
-- popup), reused across sign-off acts. Its own table rather than a column on
-- "users" because SessionAuthGuard reloads the full User row on EVERY
-- request — a base64 image column there would be fetched every request
-- whether needed or not; queried here only on My Account and at sign time.
--
-- one_time_codes: short-lived, single-use email verification codes gating
-- "attach my saved signature" at sign-off. Real expiresAt/consumedAt, unlike
-- idempotency_keys (which has neither) — a leaked/replayed code must not be
-- reusable. usedForSignOffId makes the resulting step-up proof single-use.
-- "channel" defaults to "email" and is the only value this pass implements —
-- kept as a discriminator so a future authenticator/TOTP channel is an
-- additive value, not a schema change.
--
-- sign_offs.signatureImage / signatureVerifiedAt: additive snapshot columns,
-- same "frozen at signing time, never a live reference" convention as
-- roleAtSigning/recordVersion — both stay null on the existing plain
-- sign-off path (no new friction when no signature image is attached).
-- AlterTable
ALTER TABLE "sign_offs" ADD COLUMN     "signatureImage" TEXT,
ADD COLUMN     "signatureVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_signatures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "usedForSignOffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_signatures_userId_key" ON "user_signatures"("userId");

-- CreateIndex
CREATE INDEX "one_time_codes_userId_purpose_idx" ON "one_time_codes"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "user_signatures" ADD CONSTRAINT "user_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_codes" ADD CONSTRAINT "one_time_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
