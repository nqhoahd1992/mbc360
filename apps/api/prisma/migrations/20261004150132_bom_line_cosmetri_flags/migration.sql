-- AlterTable
ALTER TABLE "bom_lines" ADD COLUMN     "fromCosmetri" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "methodRef" TEXT,
ADD COLUMN     "reconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rmDisplayName" TEXT;
