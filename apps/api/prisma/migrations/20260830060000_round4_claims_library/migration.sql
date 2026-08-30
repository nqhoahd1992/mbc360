-- Round 4 question 28 — the company-level Claims Library (group 4d).
--
-- The third and last of the reference datasets, and the only one with a workflow:
-- "Technical AND Regulatory must both approve an entry before it becomes Approved
-- Library Wording." `status` is derived from those two stamps on every write, so
-- the column exists to be READ (by C1's library condition) rather than set.
--
-- No seed rows. The library's CONTENT is the company's, and inventing approved
-- claim wording would be fabricating the very thing this table exists to control —
-- the same reason the General Restricted & Caution register ships empty.
CREATE TABLE "claim_library_entries" (
    "id" TEXT NOT NULL,
    "wording" TEXT NOT NULL,
    "claimCategory" TEXT,
    "claimRisk" TEXT,
    "evidenceRequirement" TEXT,
    "brands" TEXT,
    "productFamilies" TEXT,
    "skus" TEXT,
    "markets" TEXT,
    "languages" TEXT,
    "channels" TEXT,
    "audience" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Proposed',
    "technicalApprovedBy" TEXT,
    "technicalApprovedAt" TIMESTAMP(3),
    "regulatoryApprovedBy" TEXT,
    "regulatoryApprovedAt" TIMESTAMP(3),
    "effectiveDate" TEXT,
    "reviewDate" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnReason" TEXT,
    "proposedBy" TEXT,
    "proposedFromProjectId" TEXT,
    "proposedFromClaimId" TEXT,
    "notes" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_library_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "claim_library_entries_status_idx" ON "claim_library_entries"("status");

ALTER TABLE "claim_library_entries" ADD CONSTRAINT "claim_library_entries_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
