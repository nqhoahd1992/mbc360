-- Round 5 question 24(b): cancelling a Critical action needs the confirmation that no residual issue remains. Additive and empty.
ALTER TABLE "next_actions" ADD COLUMN "cancellationNoResidual" BOOLEAN;
