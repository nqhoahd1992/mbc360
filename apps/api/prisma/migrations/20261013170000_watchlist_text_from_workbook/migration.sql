-- Prohibited Ingredient Watch-list and Pregnancy / Breastfeeding Caution Limits: bring the READ-ONLY reference cells back
-- in line with the V18 workbook, and add the sheet's own "Reference / source" column that the first transcription dropped.
--
-- Fixed-register rows are materialised once at project creation, so changing the config alone would reach new projects only
-- (the scaffold-drift family — see CLAUDE.md). This backfills existing projects with the SAME values the config now carries.
--
-- Only cells the user cannot edit (editable: false) are written, matched on the row's own ingredientGroup, so anything a person
-- has entered (product status, disposition, reviewer trail, notes) is untouched.
-- prohibitedIngredients
UPDATE "register_rows" AS r
SET "data" = r."data" || jsonb_build_object(
      'statusLevel', v.status, 'whyItMatters', v.why, 'referenceSource', v.ref)
FROM (VALUES
  ('Parabens', 'Restricted; example levels include 0.4% individually / 0.14% combined', 'Endocrine and reproductive-health concerns for longer-chain parabens', 'Safety validation table / current market reference'),
  ('Phthalates', 'Restricted/prohibited for DEHP, DBP, DIBP, BBP under REACH classifications', 'Endocrine disruption and reproductive toxicity concerns', 'Safety validation table / current market reference'),
  ('Cyclomethicone D4/D5/D6', 'D4 banned; D5/D6 restricted in some contexts', 'Bioaccumulation, reproductive and PBT/vPvB concerns', 'Safety validation table / current market reference'),
  ('Triclosan', 'Restricted in specific product types', 'Endocrine/thyroid and fetal neurodevelopment concerns', 'Safety validation table / current market reference'),
  ('Benzophenone', 'Prohibited/restricted in some markets', 'Carcinogenicity, endocrine activity and transplacental-exposure concern', 'Safety validation table / current market reference'),
  ('Methanol', 'Restricted level in denatured alcohol systems', 'Neurotoxicity and placental-transfer concern at high exposure', 'Safety validation table / current market reference'),
  ('Heavy metals Pb Hg Cd As', 'Prohibited; trace limits vary by market', 'Neurotoxicity, nephrotoxicity, carcinogenicity and fetal-development concern', 'CoA/heavy metal test / market reference'),
  ('Lilial BMHCA', 'Prohibited in EU and high concern for maternal products', 'Reproductive toxicity classification and breast milk detection concern', 'IFRA / allergen / market reference'),
  ('Retinol Retinyl Palmitate Tretinoin', 'Restricted; pregnancy caution / contraindication logic', 'Teratogenicity and cumulative exposure concerns', 'Safety validation table / current market reference'),
  ('4-Methylbenzylidene Camphor 4-MBC', 'Prohibited/restricted in some markets', 'Endocrine disruption and breast milk detection concern', 'Safety validation table / current market reference'),
  ('Formaldehyde releasers', 'Prohibited/restricted as preservative depending on market/product', 'Carcinogenicity, sensitisation and reproductive concern', 'Safety validation table / current market reference'),
  ('Bisphenol S', 'Prohibited/restricted in some contexts', 'Endocrine/reproductive toxicity concern', 'Packaging/contact-material reference')
) AS v(grp, status, why, ref)
WHERE r."registerKey" = 'prohibitedIngredients' AND r."data"->>'ingredientGroup' = v.grp;

-- pbCautionLimits
UPDATE "register_rows" AS r
SET "data" = r."data" || jsonb_build_object(
      'statusLimitGuidance', v.status, 'whyCautionRequired', v.why, 'referenceSource', v.ref)
FROM (VALUES
  ('Oxybenzone (Benzophenone-3)', 'Caution; mineral alternatives often preferred for pregnancy positioning', 'Systemic absorption, breast milk detection and endocrine activity concerns', 'Caution table / current market reference'),
  ('Homosalate', 'Restricted/caution in some markets', 'Endocrine and systemic absorption concerns', 'Caution table / current market reference'),
  ('Hydroquinone', 'Caution/avoid pregnancy; high absorption concern', 'High dermal absorption and insufficient pregnancy data', 'Caution table / current market reference'),
  ('Essential oils', 'Caution; specify exact oil and level', 'Placental transfer potential and specific oil/lactation concerns', 'Caution table / IFRA / supplier declaration'),
  ('Caffeine topical', 'Caution; consider total caffeine exposure', 'Cumulative exposure with dietary caffeine', 'Caution table / tox rationale'),
  ('Arnica montana', 'Caution; topical only; avoid near nipples', 'Neonatal/breastfeeding transfer and sensitisation concerns', 'Caution table / botanical safety'),
  ('BHT', 'Caution; check current max and endocrine review', 'Systemic organ effects at high doses and weak endocrine signals', 'Caution table / market reference'),
  ('BHA', 'Caution; low permitted level contexts', 'Carcinogenicity/endocrine/reproductive concern in animal data', 'Caution table / market reference'),
  ('Kojic acid', 'Caution; check current limit', 'Limited pregnancy data and endocrine thyroid flags', 'Caution table / market reference'),
  ('Licorice root extract', 'Caution; check glycyrrhizin content', 'Placental cortisol-barrier mechanism and oral exposure concerns', 'Caution table / supplier spec'),
  ('Salicylic acid / salicylates', 'Caution; topical limits and product type matter', 'Dermal absorption, breast milk transfer and high-dose salicylate concern', 'Caution/substitution table'),
  ('Glycerin for vulvovaginal use', 'Caution for intimate products', 'Vaginal epithelial permeability/osmotic concerns', 'Caution table / tox rationale')
) AS v(grp, status, why, ref)
WHERE r."registerKey" = 'pbCautionLimits' AND r."data"->>'ingredientGroup' = v.grp;
