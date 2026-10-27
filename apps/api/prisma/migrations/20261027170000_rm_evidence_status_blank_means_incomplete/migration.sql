-- Supplier & Raw Material Evidence: "Incomplete — evidence review required" is no longer a stored value. A row with no conclusion and
-- no approval tick IS incomplete, and the empty cell now says so. Rows holding the old value become empty; the two real conclusions
-- (conditionally accepted, considered and not used) are untouched.
UPDATE "register_rows"
SET "data" = "data" - 'evidenceStatus'
WHERE "registerKey" = 'supplierRmEvidence' AND "data"->>'evidenceStatus' = 'Incomplete — evidence review required';
