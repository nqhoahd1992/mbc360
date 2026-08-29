-- Per-gate sign-off (Round 4 questions 18 and 29).
--
-- A new table, not an extension of `sign_offs`: that one hangs off
-- `phaseClosureId` and is therefore per-PHASE, and D1 says the phase block
-- "remains as an additional phase-closure approval and is not replaced".
--
-- Key = (projectId, gateId, market, role) — option C of
-- docs/plans/Post_Round3_Design_Decisions.md §1, confirmed by question 18.
--
-- No backfill. Rows are created lazily on nomination or signing, because the
-- per-market lanes at Gates 10-12 depend on a market list that changes during the
-- project; a set scaffolded at creation would be wrong the moment a market is
-- added or removed. An absent row means unsigned, which is exactly what the
-- `gateSignedOff` readiness check reads — so every gate starts blocked, which is
-- the correct starting state for a control that did not exist yesterday.
CREATE TABLE "gate_sign_offs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "market" TEXT,
    "role" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "signedByUserId" TEXT,
    "name" TEXT,
    "initials" TEXT,
    "signedAt" TIMESTAMP(3),
    "roleAtSigning" TEXT,
    "decision" TEXT,
    "comment" TEXT,
    "signatureImage" TEXT,
    "signatureVerifiedAt" TIMESTAMP(3),
    "snapshot" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gate_sign_offs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gate_sign_offs_projectId_gateId_idx" ON "gate_sign_offs"("projectId", "gateId");

-- Postgres treats every NULL as distinct, so this constraint alone does NOT stop
-- two "Prepared by" rows on a market-less gate — it only covers the per-market
-- lanes. The partial index below covers the other nine gates.
CREATE UNIQUE INDEX "gate_sign_offs_projectId_gateId_market_role_key"
  ON "gate_sign_offs"("projectId", "gateId", "market", "role");

CREATE UNIQUE INDEX "gate_sign_offs_no_market_key"
  ON "gate_sign_offs"("projectId", "gateId", "role")
  WHERE "market" IS NULL;

ALTER TABLE "gate_sign_offs" ADD CONSTRAINT "gate_sign_offs_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gate_sign_offs" ADD CONSTRAINT "gate_sign_offs_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gate_sign_offs" ADD CONSTRAINT "gate_sign_offs_signedByUserId_fkey"
  FOREIGN KEY ("signedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
