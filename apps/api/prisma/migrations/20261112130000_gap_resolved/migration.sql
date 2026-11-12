-- SW-39: a resolved gap keeps its assessment and records who resolved it and when (written by the server from the session).
ALTER TABLE "gate_records" ADD COLUMN "gapResolvedBy" TEXT;
ALTER TABLE "gate_records" ADD COLUMN "gapResolvedAt" TIMESTAMP(3);
