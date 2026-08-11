-- Per-project links for the phase banner shortcuts the workbook prints as
-- "(provide link here)" (cells E4/G4/I4/K4 of each phase sheet). Only the
-- shortcuts with no in-app equivalent are stored here — the rest link straight
-- to the page that replaced them.
--
-- A child table of phase_closures rather than a JSON column, matching the note
-- on preWorkAcceptedBy: per-project data stays queryable.
CREATE TABLE "phase_key_links" (
    "id" TEXT NOT NULL,
    "phaseClosureId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "phase_key_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "phase_key_links_phaseClosureId_label_key" ON "phase_key_links"("phaseClosureId", "label");

ALTER TABLE "phase_key_links" ADD CONSTRAINT "phase_key_links_phaseClosureId_fkey"
    FOREIGN KEY ("phaseClosureId") REFERENCES "phase_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
