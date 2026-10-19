-- "NPD Roadmap — Mandatory First Steps" is gone as a register: its four steps now sit on the page each one belongs to
-- (Needs, Competitor Landscape, Target Product & Tech, Evidence Plan), in each page's note. Its rows were fixed, read-only
-- reference text materialised at project creation, so nothing a person entered is lost; they are removed so no project is left
-- carrying rows for a register that no longer exists.
DELETE FROM "register_rows" WHERE "registerKey" = 'npdRoadmapFirstSteps';
DELETE FROM "register_closures" WHERE "registerKey" = 'npdRoadmapFirstSteps';
