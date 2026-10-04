-- F4 (SME rule audit D, 2026-10-04/05): concurrent formula versions per market.
-- "Launched per-market Gate 10-12 tracks are preserved for the old formula
-- version; a major change creates a new per-market Gate 10-12 track for the new
-- version." So a market track, and a per-market gate sign-off lane, belong to one
-- formula version.

-- 1. Every existing track belongs to its project's CURRENT version (the newest),
--    which is what the single-track model meant. Tracks with no version get it.
UPDATE "market_tracks" t
SET "formulaVersionId" = (
  SELECT v.id FROM "formula_versions" v
  WHERE v."projectId" = t."projectId"
  ORDER BY v."createdAt" DESC
  LIMIT 1
)
WHERE t."formulaVersionId" IS NULL;

DROP INDEX "market_tracks_projectId_market_key";
CREATE UNIQUE INDEX "market_tracks_projectId_market_formulaVersionId_key"
  ON "market_tracks"("projectId", "market", "formulaVersionId");

-- 2. Per-market sign-off lanes gain a version; existing ones belong to the
--    current version. Gates 1-9 (market IS NULL) keep NULL.
ALTER TABLE "gate_sign_offs" ADD COLUMN "formulaVersionId" TEXT;
UPDATE "gate_sign_offs" s
SET "formulaVersionId" = (
  SELECT v.id FROM "formula_versions" v
  WHERE v."projectId" = s."projectId"
  ORDER BY v."createdAt" DESC
  LIMIT 1
)
WHERE s."market" IS NOT NULL;

ALTER TABLE "gate_sign_offs"
  ADD CONSTRAINT "gate_sign_offs_formulaVersionId_fkey"
  FOREIGN KEY ("formulaVersionId") REFERENCES "formula_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX "gate_sign_offs_projectId_gateId_market_role_key";
CREATE UNIQUE INDEX "gate_sign_offs_projectId_gateId_market_formulaVersionId_rol_key"
  ON "gate_sign_offs"("projectId", "gateId", "market", "formulaVersionId", "role");
-- The partial index for market IS NULL (gate_sign_offs_no_market_key) is unchanged.
