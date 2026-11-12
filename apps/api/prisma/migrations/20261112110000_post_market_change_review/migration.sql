-- Round 5 question 10: a post-market change opens a linked Gate 12 review for the market and version, beside the earlier reviews.
ALTER TABLE "post_launch_reviews" ADD COLUMN "linkedChangeId" TEXT;
ALTER TABLE "post_launch_reviews" ADD COLUMN "formulaVersion" TEXT;
