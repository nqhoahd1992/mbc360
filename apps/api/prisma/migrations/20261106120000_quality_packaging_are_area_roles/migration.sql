-- Quality and Packaging / Artwork are the 'quality' and 'packaging' area roles themselves (project owner, 2026-11-06:
-- "Production Support" is Quality and "Sales Manager" is Packaging / Artwork), so the two optional FUNCTION roles
-- 'quality-function' and 'packaging-artwork' that briefly duplicated them are gone.
--
-- Any assignment or acknowledgement made under those two keys is removed: the person is already named by the area role
-- (every project has one, they are required at creation), and an acknowledgement given as the removed function is now
-- given as 'quality' by that area's holder. The audit trail is not touched.
DELETE FROM "project_reviewers" WHERE "roleKey" IN ('quality-function', 'packaging-artwork');
DELETE FROM "readiness_acknowledgements" WHERE "functionKey" IN ('quality-function', 'packaging-artwork');
