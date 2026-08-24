-- CreateTable
CREATE TABLE "user_totp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretEnc" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "lastUsedStep" INTEGER,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_totp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_up_proofs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'totp',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedForSignOffId" TEXT,

    CONSTRAINT "step_up_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_totp_userId_key" ON "user_totp"("userId");

-- CreateIndex
CREATE INDEX "step_up_proofs_userId_purpose_idx" ON "step_up_proofs"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "user_totp" ADD CONSTRAINT "user_totp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_up_proofs" ADD CONSTRAINT "step_up_proofs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
