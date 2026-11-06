-- The unique index added by 20261106090000_readiness_ack_by_function was named
-- "readiness_acknowledgements_projectId_gateId_itemId_functionKey_key", which is 66 characters; Postgres keeps only 63, so
-- it stored "readiness_acknowledgements_projectId_gateId_itemId_functionKey_" while Prisma expects its own shortened name
-- "readiness_acknowledgements_projectId_gateId_itemId_function_key". The index itself is right; only its name differs, and
-- `prisma migrate dev` kept asking for a name for the difference. This renames it to what Prisma expects.
ALTER INDEX "readiness_acknowledgements_projectId_gateId_itemId_functionKey_" RENAME TO "readiness_acknowledgements_projectId_gateId_itemId_function_key";
