-- Round 5 question 17 (answered 2026-11-05): the company's channel list, the events of a publication record and an explicit claim-use decision.
-- Register rows are JSONB, so this only rewrites values; nothing is added or dropped.
--
-- (a) The channel list is the company's own: Packaging/label, Website, Social media, Sales/distributor material, HCP/professional material,
--     Retailer/e-commerce listing, Advertising, Other - specify. "Release to Print" is an EVENT of the Packaging/label channel, no longer a channel.
-- (b) "Complete" is a work status, not approval. No decision is invented for an existing row: a blank claim-use decision reads as Pending, so a
--     claim-use row that was only "Complete" no longer authorises artwork or publication until a person records the decision.

-- A channel written in any of the old ways (the first build's list, or free text) as the company's value, or NULL when it is not recognisable.
CREATE FUNCTION pg_temp.canonical_channel(v text) RETURNS text AS $$
  SELECT CASE
    WHEN v IS NULL OR btrim(v) = '' THEN NULL
    WHEN v IN ('Packaging/label', 'Website', 'Social media', 'Sales/distributor material', 'HCP/professional material', 'Retailer/e-commerce listing', 'Advertising', 'Other - specify') THEN v
    WHEN v ILIKE 'Release to Print%' OR v ILIKE '%print%' OR v ILIKE '%packag%' OR v ILIKE '%label%' THEN 'Packaging/label'
    WHEN v ILIKE '%social%' THEN 'Social media'
    WHEN v ILIKE '%web%' THEN 'Website'
    WHEN v ILIKE '%hcp%' OR v ILIKE '%professional%' THEN 'HCP/professional material'
    WHEN v ILIKE '%distribut%' OR v ILIKE '%sales%' THEN 'Sales/distributor material'
    WHEN v ILIKE '%retail%' OR v ILIKE '%commerce%' THEN 'Retailer/e-commerce listing'
    WHEN v ILIKE '%advert%' THEN 'Advertising'
    WHEN v ILIKE 'Other%' THEN 'Other - specify'
    ELSE NULL
  END
$$ LANGUAGE sql IMMUTABLE;

-- Publication / Deployment Record: the channel becomes the company's value, and each row says which event it is. A row that was a "Release to Print"
-- channel is the print-release event of Packaging/label; every other existing row recorded something that went out.
UPDATE register_rows
SET data = data
  || jsonb_build_object('channel', COALESCE(pg_temp.canonical_channel(data->>'channel'), ''))
  || jsonb_build_object('event', CASE
       WHEN COALESCE(data->>'event', '') <> '' THEN data->>'event'
       WHEN data->>'channel' ILIKE 'Release to Print%' THEN 'Release to Print'
       ELSE 'Published/Deployed'
     END)
  || CASE
       WHEN COALESCE(data->>'channel', '') <> '' AND pg_temp.canonical_channel(data->>'channel') IS NULL
         THEN jsonb_build_object('notes', btrim(COALESCE(data->>'notes', '') || ' Channel was: ' || (data->>'channel')))
       ELSE '{}'::jsonb
     END
WHERE "registerKey" = 'publicationRecord';

-- SKU Claims / PIF Register and Published Information Approval: the channel was free text and is now picked from the list. A recognisable value
-- maps to the company's; anything else is kept in the notes and cleared, so a person re-picks it.
UPDATE register_rows
SET data = data
  || jsonb_build_object('intendedChannel', COALESCE(pg_temp.canonical_channel(data->>'intendedChannel'), ''))
  || CASE
       WHEN COALESCE(data->>'intendedChannel', '') <> '' AND pg_temp.canonical_channel(data->>'intendedChannel') IS NULL
         THEN jsonb_build_object('notes', btrim(COALESCE(data->>'notes', '') || ' Intended channel was: ' || (data->>'intendedChannel')))
       ELSE '{}'::jsonb
     END
WHERE "registerKey" = 'skuClaimsPifRegister';

UPDATE register_rows
SET data = data
  || jsonb_build_object('channel', COALESCE(pg_temp.canonical_channel(data->>'channel'), ''))
  || CASE
       WHEN COALESCE(data->>'channel', '') <> '' AND pg_temp.canonical_channel(data->>'channel') IS NULL
         THEN jsonb_build_object('notes', btrim(COALESCE(data->>'notes', '') || ' Channel was: ' || (data->>'channel')))
       ELSE '{}'::jsonb
     END
WHERE "registerKey" = 'publishedInfoApproval';

-- The claim-use ID is generated; existing rows get theirs in the order they were entered (a decision's stamps are carried over by it).
UPDATE register_rows rr
SET data = rr.data || jsonb_build_object('useId', 'CU-' || lpad(s.n::text, 3, '0'))
FROM (
  SELECT id, row_number() OVER (PARTITION BY "projectId" ORDER BY "rowOrder") AS n
  FROM register_rows
  WHERE "registerKey" = 'skuClaimsPifRegister'
) s
WHERE rr.id = s.id AND COALESCE(rr.data->>'useId', '') = '';
