-- A register is closed once PER GATE (SW-36): a closure carries the gate it was signed for, and the unique key gains it.
--
-- No data is carried over. The project owner confirmed on 2026-10-15 that no project exists yet, and a closure signed for the whole
-- register cannot honestly be re-labelled as one signed for a gate (it was hashed over every column). So rather than guess, this stops
-- with a message if it meets any existing closure; handle those by hand before migrating.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "register_closures") THEN
    RAISE EXCEPTION 'register_closures is not empty: closures signed before per-gate closing cannot be migrated automatically';
  END IF;
END $$;

DROP INDEX "register_closures_projectId_registerKey_key";
ALTER TABLE "register_closures" ADD COLUMN "gateId" TEXT NOT NULL;
CREATE UNIQUE INDEX "register_closures_projectId_registerKey_gateId_key" ON "register_closures"("projectId", "registerKey", "gateId");
