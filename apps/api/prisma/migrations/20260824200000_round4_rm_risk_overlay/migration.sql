-- Round 4 question 17 (2026-08-24): the shared Raw Material Risk Overlay.
--
-- "Do not re-enter this per project. The preferred long-term location is Cosmetri.
-- Until Cosmetri (or its API) can provide these fields, MBc360 maintains a shared
-- Raw Material Risk Overlay keyed to the Cosmetri raw-material ID… This is not a
-- second raw-material master."
--
-- Keyed on rmCode, which is the identifier BomLine and the Supplier & RM Evidence
-- register already carry, so the overlay joins by id rather than by trade name —
-- the join the Cosmetri integration is known to get wrong or leave blank.
--
-- Seeded empty. An unclassified material is NOT the same as a material with no
-- risk: the Gate 4 allergen trigger reads this table, and an empty overlay means
-- nobody has classified anything yet.
CREATE TABLE "raw_material_risks" (
  "id" TEXT NOT NULL,
  "rmCode" TEXT NOT NULL,
  "displayName" TEXT,
  "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "evidenceLink" TEXT,
  "reviewDate" TEXT,
  "notes" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "raw_material_risks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "raw_material_risks_rmCode_key" ON "raw_material_risks" ("rmCode");
ALTER TABLE "raw_material_risks"
  ADD CONSTRAINT "raw_material_risks_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
