-- Round 5 question 1(d), project owner 2026-11-09: the SME wrote ONE sentence about foreseeable contact, so it is one question, not a
-- maternal one and an infant one. The maternal pair becomes the single question; the infant pair goes.
--
-- Nothing is invented for existing answers. A Yes to either old question is a Yes (contact the person called foreseeable stays
-- foreseeable). Both No becomes a No, its reason carrying both old reasons so none is lost. Anything else (one answered and the other
-- not, or a No still without a reason) stays blank, which reads as "not yet assessed" and asks the person again.
ALTER TABLE "projects" ADD COLUMN "foreseeableContact" TEXT, ADD COLUMN "foreseeableContactRationale" TEXT;

UPDATE "projects" SET
  "foreseeableContactRationale" = CASE
    WHEN "foreseeableMaternalContact" = 'Yes' OR "foreseeableInfantContact" = 'Yes' THEN
      NULLIF(CONCAT_WS(' / ',
        CASE WHEN "foreseeableMaternalContact" = 'Yes' THEN NULLIF(TRIM("foreseeableMaternalRationale"), '') END,
        CASE WHEN "foreseeableInfantContact" = 'Yes' THEN NULLIF(TRIM("foreseeableInfantRationale"), '') END), '')
    WHEN "foreseeableMaternalContact" = 'No' AND "foreseeableInfantContact" = 'No'
         AND COALESCE(TRIM("foreseeableMaternalRationale"), '') <> '' AND COALESCE(TRIM("foreseeableInfantRationale"), '') <> '' THEN
      CONCAT('Maternal: ', TRIM("foreseeableMaternalRationale"), ' / Infant: ', TRIM("foreseeableInfantRationale"))
    ELSE NULL END,
  "foreseeableContact" = CASE
    WHEN "foreseeableMaternalContact" = 'Yes' OR "foreseeableInfantContact" = 'Yes' THEN 'Yes'
    WHEN "foreseeableMaternalContact" = 'No' AND "foreseeableInfantContact" = 'No'
         AND COALESCE(TRIM("foreseeableMaternalRationale"), '') <> '' AND COALESCE(TRIM("foreseeableInfantRationale"), '') <> '' THEN 'No'
    ELSE NULL END;

ALTER TABLE "projects"
  DROP COLUMN "foreseeableMaternalContact",
  DROP COLUMN "foreseeableMaternalRationale",
  DROP COLUMN "foreseeableInfantContact",
  DROP COLUMN "foreseeableInfantRationale";
