-- SW-31: stopping a project. Additive; existing projects simply are not stopped.
ALTER TABLE "projects" ADD COLUMN     "stoppedAt" TIMESTAMP(3),
ADD COLUMN     "stoppedById" TEXT,
ADD COLUMN     "stopAtGate" TEXT,
ADD COLUMN     "stopComment" TEXT,
ADD COLUMN     "stopGrounds" JSONB;

ALTER TABLE "projects" ADD CONSTRAINT "projects_stoppedById_fkey" FOREIGN KEY ("stoppedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
