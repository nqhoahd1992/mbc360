-- Released Label Control: the sheet writes "NA" (not "N/A") in its Y / N columns. Six columns spelled it "N/A"; existing values follow.
UPDATE "register_rows" SET "data" = jsonb_set("data", '{assetExists}', to_jsonb('NA'::text)) WHERE "registerKey" = 'releasedLabelRegister' AND "data"->>'assetExists' = 'N/A';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{stockAvailable}', to_jsonb('NA'::text)) WHERE "registerKey" = 'labelPlatformRollout' AND "data"->>'stockAvailable' = 'N/A';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{oldImageRemoved}', to_jsonb('NA'::text)) WHERE "registerKey" = 'labelPlatformRollout' AND "data"->>'oldImageRemoved' = 'N/A';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{imageUpdated}', to_jsonb('NA'::text)) WHERE "registerKey" = 'labelPlatformRollout' AND "data"->>'imageUpdated' = 'N/A';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{artworkMatches}', to_jsonb('NA'::text)) WHERE "registerKey" = 'labelShipmentVerification' AND "data"->>'artworkMatches' = 'N/A';
UPDATE "register_rows" SET "data" = jsonb_set("data", '{batchMatches}', to_jsonb('NA'::text)) WHERE "registerKey" = 'labelShipmentVerification' AND "data"->>'batchMatches' = 'N/A';
