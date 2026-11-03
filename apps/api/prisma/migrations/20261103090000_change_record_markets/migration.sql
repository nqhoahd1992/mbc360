-- Which of the project's markets a Change Control concerns. Empty = not market-specific, i.e. every market.
ALTER TABLE "change_records" ADD COLUMN "markets" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "change_records" SET "markets" = ARRAY[]::TEXT[] WHERE "markets" IS NULL;
ALTER TABLE "change_records" ALTER COLUMN "markets" SET NOT NULL;
