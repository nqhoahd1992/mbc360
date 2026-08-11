/**
 * Config vs database: does every project actually HAVE the rows config says it
 * should?
 *
 *   npm run verify:scaffold          (needs the dev Postgres running)
 *
 * Why this exists: checklist sections, requirement rows and `mode: 'fixed'`
 * register rows are materialised ONCE, when a project is created. Adding a
 * section to config therefore gives it to future projects only — every existing
 * project shows that table empty, and any readiness check reading it can never
 * be satisfied there. Nothing fails, nothing logs; the table just looks like a
 * feature nobody built.
 *
 * It has now happened twice in a day, both caught by a person noticing an empty
 * table rather than by any tooling:
 *   - 2026-08-10, the two gate-01 checklists (Request Origin, Development /
 *     Change Type), fixed by migration 20260810041500;
 *   - 2026-08-11, Phase 1's 16-row Project Requirements & Exclusions (SME B6,
 *     shipped 2026-08-09), fixed by migration 20260811071500.
 *
 * The fix in both cases is the same shape: a migration that backfills the rows
 * for existing projects, generated from the same config a new project reads. Run
 * this after any change to PHASE_CONFIGS' checklistSections/requirementSections
 * or to a fixed register's rows.
 */
import { execSync } from 'node:child_process';
import { PHASE_CONFIGS } from '../src/config/phases';
import { REGISTER_CONFIGS } from '../src/config/registers';

const CONTAINER = process.env.MBC_PG_CONTAINER ?? 'mbc360-postgres-dev';

function query(sql: string): string[][] {
  // Postgres needs the double quotes around camelCase identifiers, and the shell
  // would eat them — escape before interpolating.
  const escaped = sql.replace(/"/g, '\\"');
  const out = execSync(`docker exec -i ${CONTAINER} psql -U mbc360 -d mbc360 -tAF"|" -c "${escaped}"`, {
    encoding: 'utf8',
  });
  return out.trim().split('\n').filter(Boolean).map((line) => line.split('|'));
}

interface Drift {
  project: string;
  kind: string;
  key: string;
  config: number;
  db: number;
}

const projects = query('select "id" from projects order by "id"').map(([id]) => id);
if (projects.length === 0) {
  console.log('Không có dự án nào trong DB — không có gì để đối chiếu.');
  process.exit(0);
}

const counts = (table: string, column: string) => {
  const rows = query(`select "projectId", "${column}", count(*) from ${table} group by 1, 2`);
  const map = new Map<string, number>();
  for (const [projectId, key, n] of rows) map.set(`${projectId}::${key}`, Number(n));
  return map;
};

const checklistCounts = counts('checklist_items', 'sectionKey');
const requirementCounts = counts('requirement_items', 'sectionKey');
const registerCounts = counts('register_rows', 'registerKey');

const drifts: Drift[] = [];
for (const project of projects) {
  for (const phase of Object.values(PHASE_CONFIGS)) {
    for (const section of phase.checklistSections) {
      const db = checklistCounts.get(`${project}::${section.key}`) ?? 0;
      if (db !== section.options.length) {
        drifts.push({ project, kind: 'checklist', key: section.key, config: section.options.length, db });
      }
    }
    for (const section of phase.requirementSections) {
      const db = requirementCounts.get(`${project}::${section.key}`) ?? 0;
      if (db !== section.rows.length) {
        drifts.push({ project, kind: 'requirement', key: section.key, config: section.rows.length, db });
      }
    }
  }
  for (const register of REGISTER_CONFIGS) {
    // Only `fixed` registers are seeded; a `register` one is empty until a user
    // adds rows, so "0 rows" there is normal, not drift.
    if (register.mode !== 'fixed') continue;
    const want = register.fixedRows?.length ?? 0;
    const db = registerCounts.get(`${project}::${register.key}`) ?? 0;
    if (db !== want) {
      drifts.push({ project, kind: 'register', key: register.key, config: want, db });
    }
  }
}

console.log(`\n=== Scaffold drift: ${projects.length} dự án ===`);
if (drifts.length === 0) {
  console.log('✅ Mọi section/register trong config đều có đủ dòng trong DB.\n');
  process.exit(0);
}

for (const d of drifts) {
  console.log(`  ${d.project}  ${d.kind.padEnd(11)} ${d.key.padEnd(26)} config ${String(d.config).padStart(3)} · db ${String(d.db).padStart(3)}`);
}
console.log(
  `\n❌ ${drifts.length} chỗ lệch. Viết một migration bù dữ liệu, sinh các dòng TỪ CHÍNH config` +
    ` (xem 20260810041500 và 20260811071500 làm mẫu) — đừng gõ tay, để dự án cũ giống hệt dự án mới.\n`,
);
process.exit(1);
