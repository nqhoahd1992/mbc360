-- "6. Evidence & Search Rules", Section 4 (Prepared by / Approved by of the standard itself) is no longer a register: it is a sign-off
-- of a company-wide standard, not of a project, and nothing read it. The rule text beside it stays on the reference page. Its rows were
-- blank role labels materialised at project creation, so nothing a person entered is lost.
DELETE FROM "register_rows" WHERE "registerKey" = 'evidenceControlSignOff';
DELETE FROM "register_closures" WHERE "registerKey" = 'evidenceControlSignOff';
