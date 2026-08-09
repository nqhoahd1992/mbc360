-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "initialScope" TEXT,
ADD COLUMN     "initialTargetMarkets" TEXT,
ADD COLUMN     "initialTargetUsers" TEXT,
ADD COLUMN     "projectNature" TEXT,
ADD COLUMN     "requestOrigin" TEXT,
ADD COLUMN     "requestOriginOther" TEXT,
ADD COLUMN     "requesterDepartment" TEXT,
ADD COLUMN     "requesterName" TEXT;
