-- "NPD Roadmap — Mandatory 4-Part Structure" and "NPD Roadmap — Gap Register" are gone as registers: the question and note of each
-- part now sit on the page of the step they describe, and the gap register is kept as docs/reference/NPD_Front_End_Gap_Register.md.
-- Both were fixed, read-only reference text materialised at project creation, so nothing a person entered is lost; the rows are
-- removed so no project is left carrying rows for registers that no longer exist.
DELETE FROM "register_rows" WHERE "registerKey" IN ('npdRoadmapStructure', 'npdRoadmapGapRegister');
DELETE FROM "register_closures" WHERE "registerKey" IN ('npdRoadmapStructure', 'npdRoadmapGapRegister');
