-- Key Gate Check rows are scaffolded ONCE, at project creation
-- (project-scaffold.ts -> gateCheckCreates, from PHASE_CONFIGS.keyGateChecks).
-- Two rows have been added to config since the existing project was created:
--
--   01 | Initial product scope defined                                 (SME B2, 2026-08-09)
--   04 | Prohibited, restricted and caution ingredient screen completed (SME C2, 2026-08-09)
--
-- Both are read by a Mandatory readiness item (sg01-scope, sg04-prohibited-screen)
-- via `gateCheckDone`, which returns satisfied=false for a row that does not
-- exist. So on every pre-existing project Gates 01 and 04 were blocked by an item
-- with no row in the table to tick — unsatisfiable, with nothing logged.
--
-- Third and fourth occurrence of the same defect class as 20260810041500 (gate-01
-- checklists) and 20260811071500 (Phase 1 requirements). This one hid better than
-- either: those showed an EMPTY table, this shows a table that looks populated and
-- is short one row. verify:scaffold did not catch it — it covered checklist
-- sections, requirement sections and fixed registers, but not gate checks. Fixed
-- in the same commit.
--
-- Backfills ALL 38 configured rows rather than just the two known-missing ones, so
-- any other row that has drifted (or drifts before the next reset) is repaired
-- too. NOT EXISTS keyed on (projectId, gate, check) — the same identity
-- ProjectsService uses to address a gate check — so this is idempotent and cannot
-- duplicate a row anyone has already filled in.
INSERT INTO "gate_checks" ("id", "projectId", "gate", "check", "done", "ynna")
SELECT gen_random_uuid()::text, p."id", v."gate", v."check", false, 'NA'
FROM "projects" p
CROSS JOIN (VALUES
  ('01', 'Product request, opportunity and requester captured'),
  ('01', 'Initial project record opened and owner assigned'),
  ('01', 'Initial constraints, known deadlines and risk flags recorded'),
  ('01', 'Initial product scope defined'),
  ('02', 'Target user / life stage / use context selected'),
  ('02', 'Target markets and success criteria linked'),
  ('02', 'Commercial planning inputs entered or marked N/A'),
  ('03', 'Concept direction and benchmark/competitor review recorded'),
  ('03', 'Claim/benefit areas selected and evidence route identified'),
  ('03', 'Gate 1-3 decision and open actions recorded'),
  ('04', 'Ingredient functions identified and RM document pack requested'),
  ('04', 'Prohibited, restricted and caution ingredient screen completed'),
  ('04', 'Restrictions, exclusions and supplier risks screened'),
  ('04', 'Ingredient evidence / registry links added or gap actions opened'),
  ('05', 'Formula route, BOM and costing started'),
  ('05', 'Sensory target, pH/process limits and compatibility risks logged'),
  ('05', 'Development decision recorded with evidence or conditions'),
  ('06', 'Packaging format and component requirements selected'),
  ('06', 'Artwork/label needs and pack compatibility triggers identified'),
  ('06', 'Packaging cost, lead time and supplier approval requirements entered'),
  ('07', 'Safety/tolerance questions defined and vulnerable-user risks reviewed'),
  ('07', 'Pregnancy/breastfeeding and baby-contact screen completed where triggered'),
  ('07', 'Restrictions, conditions and safety evidence linked'),
  ('08', 'Testing families selected and methods/protocols referenced'),
  ('08', 'Validation report linked or placeholder/action used'),
  ('08', 'Acceptance criteria, results and CAPA pathway defined'),
  ('09', 'Stability, preservation/micro and pack compatibility program selected'),
  ('09', 'Pilot/scale-up and release criteria assessed'),
  ('09', 'Release readiness risks closed or conditionally accepted'),
  ('10', 'Evidence hierarchy applied and claims wording checked'),
  ('10', 'Countries/regulatory pathway matched and PIF/evidence file mapped'),
  ('10', 'Approved wording / limitations recorded'),
  ('11', 'Final formula/version, packaging and artwork approved'),
  ('11', 'Production records ready and GMP links added'),
  ('11', 'Launch sign-off completed and blockers recorded'),
  ('12', 'Feedback sources monitored and PV/PMS signals classified'),
  ('12', 'Complaints/issues triaged and CAPA/improvement actions assigned'),
  ('12', 'Loopback to NPD or change control recorded where needed')
) AS v("gate", "check")
WHERE NOT EXISTS (
  SELECT 1 FROM "gate_checks" g
  WHERE g."projectId" = p."id" AND g."gate" = v."gate" AND g."check" = v."check"
);
