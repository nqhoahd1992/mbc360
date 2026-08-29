-- Round 4 group 7 — the Infant & Baby Safety pathway (questions 1 and 25(c)).
--
-- Question 1: "Retain Compartment 3 as the core Gate 7 Infant & Baby Safety
-- assessment, but treat it as the FINAL COMPONENT of a broader pathway spanning
-- multiple gates — not the entire pathway by itself." Six new requirement
-- sections carry the earlier and later components, at Gates 2, 4, 5, 6, 8-9 and
-- 10; the Gate 7 compartment (INF-01..08) is unchanged.
--
-- Requirement rows are materialised ONCE, at project creation
-- (project-scaffold.ts -> requirementItemCreates, from
-- PHASE_CONFIGS.requirementSections), so a config-only change would give these
-- sections to future projects and leave every existing one with six empty tables
-- and six Conditional items that can never be satisfied. Fifth occurrence of the
-- defect class described in CLAUDE.md.
--
-- The 45 rows below were GENERATED from that same config rather than typed, and
-- `itemOrder` is the row's index within its own section, matching the unique key
-- (projectId, sectionKey, itemOrder) the scaffolder uses.

-- Question 25(c): "Family use does not automatically mean a vulnerable
-- population, but must prompt confirmation of the actual age groups included; if
-- infants or young children are included, the relevant pathway activates."
-- NULL is load-bearing: on a Family use product it means nobody has confirmed,
-- which makes the infantContact trigger return "not yet assessed" and block,
-- rather than quietly deciding the product excludes infants.
ALTER TABLE "projects"
  ADD COLUMN "familyUseAgeGroups" TEXT,
  ADD COLUMN "familyUseConfirmedBy" TEXT,
  ADD COLUMN "familyUseConfirmedDate" TEXT;

INSERT INTO "requirement_items" ("id", "projectId", "sectionKey", "itemOrder", "gate", "requirement", "minimumRequirement", "rationale", "owner", "status")
SELECT gen_random_uuid()::text, p."id", v."sectionKey", v."itemOrder", v."gate", v."requirement", v."minimum", v."rationale", v."owner", 'Not Started'
FROM "projects" p
CROSS JOIN (VALUES
  ('infantUseContext', 0, '02', 'Intended minimum age in months', 'State the youngest age the product is intended for, in months', 'Every later infant control is scaled to this age', 'Marketing / Safety'),
  ('infantUseContext', 1, '02', 'Direct infant use, incidental contact or both', 'State which of the three applies', 'Decides whether exposure is direct or transferred', 'Safety'),
  ('infantUseContext', 2, '02', 'Leave-on or rinse-off use', 'State which', 'Contact time drives the exposure assessment', 'R&I / Safety'),
  ('infantUseContext', 3, '02', 'Body area', 'State the body areas the product is intended for', 'Absorption and sensitivity vary by area', 'Safety'),
  ('infantUseContext', 4, '02', 'Frequency and amount of use', 'Applications per day and amount per use', 'Inputs to the infant-adjusted margin of safety', 'Safety'),
  ('infantUseContext', 5, '02', 'Nappy-area, face, eye-area or scalp use', 'State which of these areas are intended', 'Each carries its own occlusion, mucous-membrane or barrier concern', 'Safety'),
  ('infantUseContext', 6, '02', 'Foreseeable hand-to-mouth exposure', 'State whether hand-to-mouth transfer is foreseeable', 'Triggers the oral-safety review at Gate 4', 'Safety'),
  ('infantUseContext', 7, '02', 'Foreseeable accidental ingestion', 'State whether accidental ingestion is foreseeable', 'Drives packaging and warning requirements at Gate 6', 'Safety'),
  ('infantUseContext', 8, '02', 'Use on damaged or compromised skin', 'State whether use on damaged or compromised skin is intended or foreseeable', 'Compromised barrier changes absorption and tolerance', 'Safety'),
  ('infantUseContext', 9, '02', 'Caregiver use or direct application to the infant', 'State whether the caregiver uses it or it is applied to the infant', 'Decides whose exposure is being assessed', 'Safety / Marketing'),
  ('infantIngredientSuitability', 0, '04', 'Infant suitability assessment for each proposed ingredient', 'Every proposed ingredient assessed for infant suitability', 'Infant skin is more permeable and less tolerant than adult skin', 'Safety / R&I'),
  ('infantIngredientSuitability', 1, '04', 'Restricted and prohibited ingredient review', 'Watch-list screen completed against the infant use context', 'Restrictions differ for infant products', 'Regulatory'),
  ('infantIngredientSuitability', 2, '04', 'Fragrance, essential-oil and allergen review', 'Fragrance, essential oils and allergens reviewed for infant contact', 'Infant respiratory and skin sensitivity', 'R&I / Safety'),
  ('infantIngredientSuitability', 3, '04', 'Impurity, contaminant and residual-solvent review', 'Impurities, contaminants and residual solvents reviewed', 'Trace levels acceptable for adults may not be for infants', 'Quality / Safety'),
  ('infantIngredientSuitability', 4, '04', 'Heavy-metal and microbiological risk review where relevant', 'Reviewed, or N/A with a rationale', 'Applies where the material or process carries that risk', 'Quality / Safety'),
  ('infantIngredientSuitability', 5, '04', 'Oral-safety consideration where hand-to-mouth exposure is foreseeable', 'Reviewed, or N/A with a rationale', 'Follows the Gate 2 hand-to-mouth answer', 'Safety'),
  ('infantIngredientSuitability', 6, '04', 'Eye-exposure assessment where eye contact is reasonably foreseeable', 'Reviewed, or N/A with a rationale', 'Follows the Gate 2 eye-area answer', 'Safety'),
  ('infantIngredientSuitability', 7, '04', 'Supplier evidence links', 'Supplier evidence linked for each material relied on', 'The assessment has to rest on documents, not assertions', 'Procurement / R&I'),
  ('infantFormulaAssessment', 0, '05', 'Final ingredient concentrations', 'Final concentrations recorded for the locked formula', 'The exposure assessment is only as good as the concentrations', 'R&I'),
  ('infantFormulaAssessment', 1, '05', 'Formula pH and compatibility with infant skin', 'pH and infant-skin compatibility assessed', 'Infant skin barrier is thinner and less acidic', 'R&I / Safety'),
  ('infantFormulaAssessment', 2, '05', 'Preservative strategy and microbiological protection', 'Preservative strategy assessed for an infant product', 'Microbiological failure is a direct infant safety risk', 'Quality / R&I'),
  ('infantFormulaAssessment', 3, '05', 'Exposure assessment and infant-adjusted margin-of-safety rationale', 'MoS calculated on infant body weight and surface area', 'An adult MoS does not transfer to an infant', 'Safety'),
  ('infantFormulaAssessment', 4, '05', 'Potential degradation products or ingredient interactions', 'Degradation and interaction risks assessed', 'What the formula becomes matters as much as what it is', 'R&I / Quality'),
  ('infantFormulaAssessment', 5, '05', 'Process controls needed to preserve ingredient quality and safety', 'Critical process controls identified', 'Safety depends on the formula being made as designed', 'Manufacturing / Quality'),
  ('infantFormulaAssessment', 6, '05', 'Intended dose or amount per use', 'Dose or amount per use defined', 'Feeds both the MoS and the Gate 6 dose-delivery requirement', 'R&I / Safety'),
  ('infantPackaging', 0, '06', 'Appropriate dose delivery', 'Pack delivers the intended dose', 'Over-delivery undoes the Gate 5 exposure assessment', 'Packaging / R&I'),
  ('infantPackaging', 1, '06', 'Control of excessive dispensing where relevant', 'Assessed, or N/A with a rationale', 'Applies to pack formats that can over-dispense', 'Packaging'),
  ('infantPackaging', 2, '06', 'Accidental access or ingestion risk', 'Risk of an infant opening or ingesting the product assessed', 'Follows the Gate 2 accidental-ingestion answer', 'Packaging / Safety'),
  ('infantPackaging', 3, '06', 'Suitable closure and packaging', 'Closure and pack suitable for an infant product', 'Closure integrity is part of the safety case', 'Packaging'),
  ('infantPackaging', 4, '06', 'Age and use instructions', 'Minimum age and use instructions drafted', 'The Gate 2 age answer has to reach the label', 'Regulatory / Marketing'),
  ('infantPackaging', 5, '06', 'Required warnings', 'Warnings required for infant use drafted', 'Warnings are a control, not a formality', 'Regulatory'),
  ('infantPackaging', 6, '06', 'Directions for safe caregiver use', 'Caregiver directions drafted', 'The caregiver is who actually applies the product', 'Regulatory / Marketing'),
  ('infantTesting', 0, '08', 'Skin tolerance', 'Triggered and planned, or N/A with a rationale', 'Infant skin tolerance cannot be inferred from adult data', 'Safety / Quality'),
  ('infantTesting', 1, '08', 'Eye safety', 'Triggered and planned, or N/A with a rationale', 'Applies where eye contact is reasonably foreseeable', 'Safety'),
  ('infantTesting', 2, '09', 'Preservative efficacy', 'Triggered and planned, or N/A with a rationale', 'Microbiological protection over the in-use life', 'Quality'),
  ('infantTesting', 3, '09', 'Microbiological quality', 'Triggered and planned, or N/A with a rationale', 'Release limits appropriate to an infant product', 'Quality'),
  ('infantTesting', 4, '09', 'Stability', 'Triggered and planned, or N/A with a rationale', 'Degradation products were assessed at Gate 5 on the assumption of stability', 'Quality / R&I'),
  ('infantTesting', 5, '09', 'Packaging compatibility', 'Triggered and planned, or N/A with a rationale', 'Pack interaction can change what the infant is exposed to', 'Packaging / Quality'),
  ('infantTesting', 6, '09', 'In-use or consumer testing where appropriate', 'Triggered and planned, or N/A with a rationale', 'Real caregiver use differs from laboratory conditions', 'R&I / Marketing'),
  ('infantPif', 0, '10', 'Infant-use safety conclusion', 'The Gate 7 conclusion carried into the PIF', 'The dossier has to state the conclusion, not just hold the working', 'Safety / Regulatory'),
  ('infantPif', 1, '10', 'Relevant ingredient and formula assessments', 'Gate 4 and Gate 5 infant assessments included or linked', 'The conclusion is only readable with its basis', 'Regulatory'),
  ('infantPif', 2, '10', 'Applicable test reports', 'Reports from the Gates 8-9 testing included', 'Evidence, not summary', 'Quality / Regulatory'),
  ('infantPif', 3, '10', 'Approved age and use statements', 'Minimum age and use statements approved and included', 'The Gate 2 age answer reaching the dossier', 'Regulatory'),
  ('infantPif', 4, '10', 'Evidence supporting infant-related claims', 'Each infant claim linked to its evidence', 'An infant claim carries a higher evidential bar', 'Regulatory / Claims'),
  ('infantPif', 5, '10', 'Label warnings and directions', 'Gate 6 warnings and directions included as released', 'The dossier must match the pack', 'Regulatory / Packaging')
) AS v("sectionKey", "itemOrder", "gate", "requirement", "minimum", "rationale", "owner")
WHERE NOT EXISTS (
  SELECT 1 FROM "requirement_items" r
  WHERE r."projectId" = p."id" AND r."sectionKey" = v."sectionKey" AND r."itemOrder" = v."itemOrder"
);
