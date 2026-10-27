-- The three Released Label Control blocks change their generated ID prefix: RL -> LBL (Released Label vs Current Artwork Register),
-- RO -> RLT (Platform / Channel Rollout & Stock Confirmation), SH -> SHP (Shipment Label & Batch Verification). Existing rows keep
-- their number; the Block A references on the other two blocks follow the rename, so no link is orphaned.
UPDATE "register_rows"
SET "data" = jsonb_set("data", '{recordId}', to_jsonb('LBL-' || substr("data"->>'recordId', 4)))
WHERE "registerKey" = 'releasedLabelRegister' AND "data"->>'recordId' ~ '^RL-[0-9]+$';

UPDATE "register_rows"
SET "data" = jsonb_set("data", '{rolloutId}', to_jsonb('RLT-' || substr("data"->>'rolloutId', 4)))
WHERE "registerKey" = 'labelPlatformRollout' AND "data"->>'rolloutId' ~ '^RO-[0-9]+$';

UPDATE "register_rows"
SET "data" = jsonb_set("data", '{shipmentId}', to_jsonb('SHP-' || substr("data"->>'shipmentId', 4)))
WHERE "registerKey" = 'labelShipmentVerification' AND "data"->>'shipmentId' ~ '^SH-[0-9]+$';

UPDATE "register_rows"
SET "data" = jsonb_set("data", '{linkedRecordId}', to_jsonb('LBL-' || substr("data"->>'linkedRecordId', 4)))
WHERE "registerKey" IN ('labelPlatformRollout', 'labelShipmentVerification') AND "data"->>'linkedRecordId' ~ '^RL-[0-9]+$';
