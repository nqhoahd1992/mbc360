-- Artwork / Label Review Checklist: the second table of the workbook's Packaging_Specs_Artwork sheet. A fixed register's rows
-- are materialised once at project creation, so every existing project gets the thirteen rows now (generated from the same config
-- a new project reads). A project that already has a row at a position keeps it.
INSERT INTO "register_rows" ("id", "projectId", "registerKey", "rowOrder", "data", "updatedAt")
SELECT gen_random_uuid()::text, p."id", 'artworkLabelReviewChecklist', v.ord, v.data, now()
FROM "projects" AS p
CROSS JOIN (VALUES
  (0, '{"reviewItem":"Product identity","requirement":"Product name, SKU, net content and market match project record","owner":"Regulatory / Brand","status":"Not Started"}'::jsonb),
  (1, '{"reviewItem":"Ingredient list / INCI","requirement":"Formula_BOM version and INCI order reviewed","owner":"Regulatory / R&I","status":"Not Started"}'::jsonb),
  (2, '{"reviewItem":"Directions / warnings","requirement":"Use instructions, pregnancy/BF restrictions and safety warnings included","owner":"Regulatory / Safety","status":"Not Started"}'::jsonb),
  (3, '{"reviewItem":"Claims and benefit wording","requirement":"All claims match approved wording and evidence level","owner":"Marketing / Regulatory","status":"Not Started"}'::jsonb),
  (4, '{"reviewItem":"Barcode / pack codes","requirement":"Barcode, item code, lot/date coding and pack dimensions verified","owner":"Packaging / Supply","status":"Not Started"}'::jsonb),
  (5, '{"reviewItem":"Market language / symbols","requirement":"Local language, mandatory marks and distributor/importer details checked","owner":"Regulatory","status":"Not Started"}'::jsonb),
  (6, '{"reviewItem":"Final proof release","requirement":"Approved print-ready file released and obsolete versions archived","owner":"Packaging / QA","status":"Not Started"}'::jsonb),
  (7, '{"reviewItem":"Tags for Proprietary Extracts on Labels","requirement":"* SALVOTECT™, ** STACREGENIX™, ***MBC BIOFLORAL HONEY (lovingly harvested from our resident bees). Proprietary ingredients exclusive to Max Biocare Research Parks, Gippsland ****UVALIFE ANTIOXIDANT BLEND™ Proprietary ingredient exclusive to Max Biocare Pty Ltd","owner":"Packaging / QA","notes":"Use exactly as is","status":"Not Started"}'::jsonb),
  (8, '{"reviewItem":"Correct names for PI","requirement":"Salvia microphylla water extract → Salvotect™ (MBc Research Parks PI)","status":"Not Started"}'::jsonb),
  (9, '{"reviewItem":"Correct names for PI","requirement":"Stachys byzantina water extract → Stacregenix™ (MBc Research Parks PI)","status":"Not Started"}'::jsonb),
  (10, '{"reviewItem":"Correct names for PI","requirement":"Honey → MBc Biofloral Honey (MBc Research Parks PI; changed from MBc Herbal Honey since 30 June 2026)","status":"Not Started"}'::jsonb),
  (11, '{"reviewItem":"Correct names for PI","requirement":"[VITIS VINIFERA (GRAPE) SEED EXTRACT, VITIS VINIFERA (GRAPE) FRUIT EXTRACT, WINE (RED WINE) EXTRACT], → Uvalife® Antioxidant Blend (MBc Proprietary Blend)","status":"Not Started"}'::jsonb),
  (12, '{"reviewItem":"Correct names for PI","requirement":"Aqua (mineral water) → Aquadene®Mineral-Rich Water (MBc Research Parks PI)","status":"Not Started"}'::jsonb)
) AS v(ord, data)
WHERE NOT EXISTS (
  SELECT 1 FROM "register_rows" AS e
  WHERE e."projectId" = p."id" AND e."registerKey" = 'artworkLabelReviewChecklist' AND e."rowOrder" = v.ord
);
