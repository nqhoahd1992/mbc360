-- Round 4 questions 4, 27(d), 35(b) — 2026-08-24.
--
-- The first company-level controlled reference dataset, plus the revision log all
-- three of them share. A new kind of thing in this schema: not per-project like the
-- ~30 registers, which are copied into a project at creation. Question 28 is
-- explicit that a shared list cannot work that way — "Projects read from the
-- library but do not directly edit it".
--
-- Question 4's instruction is the reason this exists at all: "Do not use a
-- permanently hard-coded country list. Regulatory maintains a configurable market
-- profile." Seeded empty on purpose — an empty profile table means "Regulatory has
-- not configured this market", which is a state the app must be able to show
-- rather than guess past.

CREATE TABLE "reference_revisions" (
  "id" TEXT NOT NULL,
  "dataset" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "reason" TEXT,
  "changedById" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reference_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "reference_revisions_dataset_entryId_revision_key"
  ON "reference_revisions" ("dataset", "entryId", "revision");
CREATE INDEX "reference_revisions_dataset_entryId_idx"
  ON "reference_revisions" ("dataset", "entryId");
ALTER TABLE "reference_revisions"
  ADD CONSTRAINT "reference_revisions_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "market_profiles" (
  "id" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "adverseEventReporting" BOOLEAN NOT NULL DEFAULT false,
  "pmsRecordsRequired" BOOLEAN NOT NULL DEFAULT false,
  "reviewIntervalMonths" INTEGER,
  "enhancedSurveillance" BOOLEAN NOT NULL DEFAULT false,
  "dossierType" TEXT,
  "claimRestrictions" TEXT,
  "evidenceLink" TEXT,
  "reviewDate" TEXT,
  "notes" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "market_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "market_profiles_market_key" ON "market_profiles" ("market");
ALTER TABLE "market_profiles"
  ADD CONSTRAINT "market_profiles_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
