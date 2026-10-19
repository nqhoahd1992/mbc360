-- A register page that carries the workbook's own sign-off block (Needs & Scientific Basis, Target Product & Tech Platform) names its
-- three roles itself, and the project's Lead nominates the person for each — the same shape as a phase sign-off. The nominee is stored on
-- the closing's sign-off row (rows are created lazily, on nomination or signing).
ALTER TABLE "register_closure_sign_offs" ADD COLUMN "assignedToUserId" TEXT;
ALTER TABLE "register_closure_sign_offs"
  ADD CONSTRAINT "register_closure_sign_offs_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The two typed Name + Date sign-off registers are replaced by that closing block; their rows were typed text, never a signature.
DELETE FROM "register_rows" WHERE "registerKey" IN ('needsSignOff', 'targetProductSignOff');
DELETE FROM "register_closures" WHERE "registerKey" IN ('needsSignOff', 'targetProductSignOff');
