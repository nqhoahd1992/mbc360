-- Panel Feedback follows the v2 workbook (project owner, 2026-10-16): "Too oily / slippery?" is No / Borderline / Yes and
-- "Would recommend?" is Yes / No / Maybe — dropdowns, not yes/no switches — and the sheet's "Follow-up action" column exists.
-- An old true/false carries over as Yes/No, the only two words both versions share.
ALTER TABLE "feedback_entries" ADD COLUMN "followUpAction" TEXT;

ALTER TABLE "feedback_entries" ALTER COLUMN "tooOilySlippery" DROP DEFAULT;
ALTER TABLE "feedback_entries" ALTER COLUMN "tooOilySlippery" TYPE TEXT USING CASE WHEN "tooOilySlippery" THEN 'Yes' ELSE 'No' END;
ALTER TABLE "feedback_entries" ALTER COLUMN "tooOilySlippery" SET DEFAULT 'No';

ALTER TABLE "feedback_entries" ALTER COLUMN "wouldRecommend" DROP DEFAULT;
ALTER TABLE "feedback_entries" ALTER COLUMN "wouldRecommend" TYPE TEXT USING CASE WHEN "wouldRecommend" THEN 'Yes' ELSE 'No' END;
ALTER TABLE "feedback_entries" ALTER COLUMN "wouldRecommend" SET DEFAULT 'Yes';
