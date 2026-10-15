-- At the seven critical gates the project Lead names a person who represents the gate's independent function (Safety, Regulatory,
-- Quality, Technical) and the signature slot — Reviewed by or Approved by — that person fills (Round 4 question 29(4)).
-- The row carrying the function is that slot; NULL everywhere else, so nothing existing changes.
ALTER TABLE "gate_sign_offs" ADD COLUMN "representsFunction" TEXT;
