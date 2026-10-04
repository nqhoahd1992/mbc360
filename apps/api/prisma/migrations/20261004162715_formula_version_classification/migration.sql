-- AlterTable
ALTER TABLE "formula_versions" ADD COLUMN     "classificationConfirmedBy" TEXT,
ADD COLUMN     "majorCriteria" TEXT[] DEFAULT ARRAY[]::TEXT[];
