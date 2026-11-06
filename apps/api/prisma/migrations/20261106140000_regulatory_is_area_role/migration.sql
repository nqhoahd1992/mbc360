-- "Regulatory Affairs Manager" and "Regulatory" are one role (project owner, 2026-11-06), as with Quality and Packaging / Artwork:
-- the 'regulatory' area role is the Regulatory function, so the optional FUNCTION role 'regulatory-function' that briefly
-- duplicated it is gone. Any assignment or acknowledgement made under that key is removed: the person is already named by the
-- area role (required at creation), and an acknowledgement is now given as 'regulatory' by that area's holder.
DELETE FROM "project_reviewers" WHERE "roleKey" = 'regulatory-function';
DELETE FROM "readiness_acknowledgements" WHERE "functionKey" = 'regulatory-function';
