-- Round 4 group 8 — per-market lifecycle and post-market (questions 2, 13, 14).
--
-- Three additions, no backfill that invents anything:
--
--   market_tracks.actualLaunchDate — questions 13 and 14. Deliberately NOT
--     populated from launchApprovedDate: those are two different facts (permission
--     to sell versus the day selling started), and copying one into the other
--     would fabricate a launch date and start a review clock nobody set. Every
--     existing row stays NULL, which reads as "not launched yet" — correct, since
--     nobody has ever recorded an actual launch in this app.
--
--   post_launch_reviews — question 13. The SCHEDULE is derived from the launch
--     date; this table holds only what was actually done about a milestone.
--
--   supersession_decisions — question 2. Ten facts per market, all entered by a
--     person: "the supersession decision must be recorded by a person, never
--     inferred automatically by the system."
--
-- formula_versions.status keeps its column and its 'Active' default; its
-- vocabulary widens from two values to six in code. Existing rows hold 'Active' or
-- 'Superseded', both of which are still valid members of the new list, so there is
-- nothing to migrate — and re-labelling an old 'Superseded' as 'Transition in
-- Progress' would assert that a transition nobody recorded is still under way.

-- IF NOT EXISTS throughout: this migration was amended after its DDL half had
-- already been applied to the dev database, so it has to be safely re-runnable.
-- That is worth keeping generally — a migration that cannot be re-applied can
-- only be recovered by editing the migrations table by hand.
ALTER TABLE "market_tracks"
  ADD COLUMN IF NOT EXISTS "actualLaunchDate" DATE,
  ADD COLUMN IF NOT EXISTS "withdrawnDate" DATE,
  ADD COLUMN IF NOT EXISTS "withdrawnReason" TEXT;

CREATE TABLE IF NOT EXISTS "post_launch_reviews" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "completedDate" DATE,
    "reviewer" TEXT,
    "outcome" TEXT,
    "evidenceLink" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_launch_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "post_launch_reviews_projectId_market_milestone_key"
  ON "post_launch_reviews"("projectId", "market", "milestone");

DO $$ BEGIN
  ALTER TABLE "post_launch_reviews" ADD CONSTRAINT "post_launch_reviews_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "supersession_decisions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "replacementVersion" TEXT,
    "effectiveTransitionDate" DATE,
    "lastReleaseDate" DATE,
    "stockDisposition" TEXT,
    "regulatoryNotificationStatus" TEXT,
    "artworkTransition" TEXT,
    "pifUpdate" TEXT,
    "salesMarketingCommunication" TEXT,
    "distributorCommunication" TEXT,
    "noFurtherBatchesConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supersession_decisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "supersession_decisions_projectId_version_market_key"
  ON "supersession_decisions"("projectId", "version", "market");

DO $$ BEGIN
  ALTER TABLE "supersession_decisions" ADD CONSTRAINT "supersession_decisions_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Question 10 — the sixteen post-market options split into source / issue type /
-- resulting action. "CAPA is a resulting action, not a feedback source" is the
-- sentence that made the split unavoidable.
--
-- Checklist rows are materialised once at project creation, so this reaches every
-- existing project. Three steps, in order, so nothing recorded is lost:
--   1. rewrite `postMarketSources` in place — it keeps its key (nothing has to
--      migrate a section name) but drops to the nine SOURCE options;
--   2. create the two new sections;
--   3. carry each old tick to whichever new list its option now belongs to.
--
-- The carry-over below is a MAPPING between two option lists, and it is the one
-- interpretive step here — but every pair is named in the answer's own three
-- lists, so no tick lands anywhere the answer did not put it. The three old
-- options with no home ('FAQ update' -> 'FAQ update' under action; 'Claim
-- question' -> 'Claim or communication question' under issue type; 'Adverse event
-- / PV signal' and 'PMS trend' -> 'Safety or adverse event') are the answer's own
-- rewordings.

-- 1. Park the old rows so the new nine can take orders 0-8 cleanly, keeping the
-- old ticks readable for step 3.
UPDATE "checklist_items" SET "itemOrder" = "itemOrder" + 1000
WHERE "sectionKey" = 'postMarketSources';

INSERT INTO "checklist_items" ("id", "projectId", "sectionKey", "itemOrder", "label", "gate", "ownerFunction", "selected", "status")
SELECT gen_random_uuid()::text, p."id", 'postMarketSources', v."ord", v."label", '12', 'Quality / PV-PMS', false, 'NA'
FROM "projects" p
CROSS JOIN (VALUES
  (0, 'Consumer'), (1, 'HCP'), (2, 'Distributor'), (3, 'Retailer'), (4, 'Sales'),
  (5, 'Social media'), (6, 'Customer service'), (7, 'Regulator'),
  (8, 'Internal Quality or Manufacturing')
) AS v("ord", "label")
WHERE NOT EXISTS (
  SELECT 1 FROM "checklist_items" c
  WHERE c."projectId" = p."id" AND c."sectionKey" = 'postMarketSources' AND c."itemOrder" = v."ord"
);

-- 2. The two new sections.
INSERT INTO "checklist_items" ("id", "projectId", "sectionKey", "itemOrder", "label", "gate", "ownerFunction", "selected", "status")
SELECT gen_random_uuid()::text, p."id", 'postMarketIssueType', v."ord", v."label", '12', 'Quality / PV-PMS', false, 'NA'
FROM "projects" p
CROSS JOIN (VALUES
  (0, 'Safety or adverse event'), (1, 'Product performance'), (2, 'Claim or communication question'),
  (3, 'Packaging issue'), (4, 'Formula issue'), (5, 'Quality issue'),
  (6, 'FAQ or education requirement'), (7, 'Product optimisation opportunity')
) AS v("ord", "label")
WHERE NOT EXISTS (
  SELECT 1 FROM "checklist_items" c
  WHERE c."projectId" = p."id" AND c."sectionKey" = 'postMarketIssueType' AND c."itemOrder" = v."ord"
);

INSERT INTO "checklist_items" ("id", "projectId", "sectionKey", "itemOrder", "label", "gate", "ownerFunction", "selected", "status")
SELECT gen_random_uuid()::text, p."id", 'postMarketAction', v."ord", v."label", '12', 'Quality / PV-PMS', false, 'NA'
FROM "projects" p
CROSS JOIN (VALUES
  (0, 'PMS review'), (1, 'CAPA'), (2, 'Change Control'), (3, 'FAQ update'),
  (4, 'Product optimisation'), (5, 'No further action')
) AS v("ord", "label")
WHERE NOT EXISTS (
  SELECT 1 FROM "checklist_items" c
  WHERE c."projectId" = p."id" AND c."sectionKey" = 'postMarketAction' AND c."itemOrder" = v."ord"
);

-- 3. Carry every old tick to its new home.
UPDATE "checklist_items" dest
SET "selected" = true, "status" = 'Y'
FROM "checklist_items" src
JOIN (VALUES
  ('Consumer feedback',        'postMarketSources',   'Consumer'),
  ('HCP feedback',             'postMarketSources',   'HCP'),
  ('Distributor feedback',     'postMarketSources',   'Distributor'),
  ('Retailer feedback',        'postMarketSources',   'Retailer'),
  ('Sales feedback',           'postMarketSources',   'Sales'),
  ('Social media feedback',    'postMarketSources',   'Social media'),
  ('Complaint',                'postMarketIssueType', 'Safety or adverse event'),
  ('Adverse event / PV signal','postMarketIssueType', 'Safety or adverse event'),
  ('PMS trend',                'postMarketIssueType', 'Safety or adverse event'),
  ('Claim question',           'postMarketIssueType', 'Claim or communication question'),
  ('Packaging issue',          'postMarketIssueType', 'Packaging issue'),
  ('Formula issue',            'postMarketIssueType', 'Formula issue'),
  ('Quality issue',            'postMarketIssueType', 'Quality issue'),
  ('FAQ update',               'postMarketAction',    'FAQ update'),
  ('CAPA',                     'postMarketAction',    'CAPA'),
  ('Product optimisation',     'postMarketAction',    'Product optimisation')
) AS m("oldLabel", "newSection", "newLabel") ON m."oldLabel" = src."label"
WHERE src."sectionKey" = 'postMarketSources'
  AND src."itemOrder" >= 1000
  AND src."selected" = true
  AND dest."projectId" = src."projectId"
  AND dest."sectionKey" = m."newSection"
  AND dest."label" = m."newLabel";

-- 4. Drop the parked originals.
DELETE FROM "checklist_items" WHERE "sectionKey" = 'postMarketSources' AND "itemOrder" >= 1000;
