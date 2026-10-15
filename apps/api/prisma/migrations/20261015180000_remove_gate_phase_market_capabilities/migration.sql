-- Gate decisions, phase approvals and market approvals are no longer capabilities (SW-37): inside a project authority comes
-- from the project's assignment (the gate's nominated Approved-by signer, the Lead, administrators; for market approvals the
-- project's Regulatory and Project Manager people). Their permission rows and every grant of them go. role_permissions rows
-- cascade from the permission row.
DELETE FROM "permissions"
WHERE ("resource" LIKE 'gate:%' AND "action" = 'decide')
   OR ("resource" LIKE 'phase:%' AND "action" = 'approve')
   OR ("resource" = 'market-track' AND "action" = 'approve');
