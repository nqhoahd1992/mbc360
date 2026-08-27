/**
 * Config vs database: does every project actually HAVE the rows config says it
 * should?
 *
 *   npm run verify:scaffold          (needs the dev Postgres running)
 *
 * Why this exists: checklist sections, requirement rows, Key Gate Check rows and
 * `mode: 'fixed'` register rows are materialised ONCE, when a project is created.
 * Adding a section to config therefore gives it to future projects only — every
 * existing project shows that table empty, and any readiness check reading it can
 * never be satisfied there. Nothing fails, nothing logs; the table just looks like
 * a feature nobody built.
 *
 * It has now happened four times, every one caught by a person rather than by
 * tooling:
 *   - 2026-08-10, the two gate-01 checklists (Request Origin, Development /
 *     Change Type), fixed by migration 20260810041500;
 *   - 2026-08-11, Phase 1's 16-row Project Requirements & Exclusions (SME B6,
 *     shipped 2026-08-09), fixed by migration 20260811071500;
 *   - 2026-08-12, two Key Gate Check rows (SME B2 and C2, both shipped
 *     2026-08-09), fixed by migration 20260812043000 — and by widening this
 *     script, which until then did not look at gate checks at all and reported
 *     clean while two gates were unsatisfiable.
 *
 * That last one is the argument for checking identity and not only counts: it hid
 * better than the first two, which showed an EMPTY table, because a table short
 * one row out of four looks populated.
 *
 * The fix is always the same shape: a migration that backfills the rows for
 * existing projects, generated from the same config a new project reads. Run this
 * after any change to PHASE_CONFIGS' checklistSections / requirementSections /
 * keyGateChecks, a fixed register's rows, or which registers carry a gate (the
 * closing feature added 2026-08-27 scaffolds a RegisterClosure + 2 sign-off
 * rows for every register gateRefHighestGateId resolves — checked below the
 * same way gate checks are, by identity, since a register missing its
 * closure row can never satisfy unclosedRegistersBlocking for it).
 */
import { execSync } from 'node:child_process';
import { PHASE_CONFIGS } from '../src/config/phases';
import { REGISTER_CONFIGS } from '../src/config/registers';
import { gateRefHighestGateId } from '../src/utils/gateProgress';

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
  // Gate checks are compared by identity, not just count, so the report can name
  // the rows that are actually missing.
  missing?: string[];
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

// Key Gate Checks are scaffolded once too, and were the third and fourth case of
// this defect (2026-08-12, migration 20260812043000): two rows added to config on
// 2026-08-09 never reached the existing project, so `gateCheckDone` — which reads
// satisfied=false for a row that does not exist — blocked Gates 01 and 04 with no
// row on screen to tick. Compared by IDENTITY rather than by count, because a
// renamed check leaves the count equal while breaking the item that reads it.
const gateCheckKeys = new Map<string, Set<string>>();
for (const [projectId, gate, check] of query('select "projectId", gate, "check" from gate_checks')) {
  const set = gateCheckKeys.get(projectId) ?? new Set<string>();
  set.add(`${gate}|${check}`);
  gateCheckKeys.set(projectId, set);
}
const wantedGateChecks = Object.values(PHASE_CONFIGS).flatMap((phase) =>
  phase.keyGateChecks.map((kc) => `${kc.gate}|${kc.check}`),
);

// Register closing (2026-08-27): every register with a specific gate needs a
// RegisterClosure + 2 RegisterClosureSignOff rows ('Review owner', 'Co-sign')
// per project — the exact universe gateRefHighestGateId is non-undefined for.
const closeableRegisters = REGISTER_CONFIGS.filter((r) => !!gateRefHighestGateId(r.gate));
const WANTED_CLOSURE_ROLES = ['Review owner', 'Co-sign'];
const registerClosureRoles = new Map<string, Map<string, Set<string>>>();
for (const [projectId, registerKey, role] of query(
  'select rc."projectId", rc."registerKey", rcso.role from register_closures rc' +
    ' left join register_closure_sign_offs rcso on rcso."closureId" = rc.id',
)) {
  const byRegister = registerClosureRoles.get(projectId) ?? new Map<string, Set<string>>();
  const roles = byRegister.get(registerKey) ?? new Set<string>();
  if (role) roles.add(role);
  byRegister.set(registerKey, roles);
  registerClosureRoles.set(projectId, byRegister);
}

const drifts: Drift[] = [];
for (const project of projects) {
  const have = gateCheckKeys.get(project) ?? new Set<string>();
  const missing = wantedGateChecks.filter((key) => !have.has(key));
  if (missing.length > 0) {
    drifts.push({
      project,
      kind: 'gate check',
      key: `${missing.length} dòng`,
      config: wantedGateChecks.length,
      db: have.size,
      missing,
    });
  }
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
  // Register closing (2026-08-27) — same "materialised once at creation"
  // hazard as gate checks above, and compared by identity for the same
  // reason: a project missing its RegisterClosure row for a given register
  // can never satisfy unclosedRegistersBlocking for that register, silently
  // stuck the same way a missing gate check row was in 2026-08-12.
  const closureRoles = registerClosureRoles.get(project) ?? new Map<string, Set<string>>();
  for (const register of closeableRegisters) {
    const roles = closureRoles.get(register.key) ?? new Set<string>();
    const missing = WANTED_CLOSURE_ROLES.filter((r) => !roles.has(r));
    if (missing.length > 0) {
      drifts.push({
        project,
        kind: 'register closure',
        key: register.key,
        config: WANTED_CLOSURE_ROLES.length,
        db: roles.size,
        missing,
      });
    }
  }
}

// Since 2026-08-20 a phase sign-off's signers are nominated by the project's
// LEAD, matched against `projects.projectLead` (a displayName — see R5-Q1). A
// project whose lead is not an active account therefore has nobody who can
// nominate a signer except an admin, and nothing anywhere says so. Found the
// hard way: the demo project still carried a pre-user-picker free-text lead
// ("Anna Tran") months after the seeder started using a real account.
const activeUsers = new Set(
  query('select "displayName" from users where active').map(([displayName]) => displayName.trim()),
);
const orphanLeads = query('select "id", "projectLead" from projects order by "id"').filter(
  ([, lead]) => !activeUsers.has((lead ?? '').trim()),
);

console.log(`\n=== Scaffold drift: ${projects.length} dự án ===`);
if (orphanLeads.length > 0) {
  console.log('\n⚠️  Project Lead không khớp user đang hoạt động nào — chỉ admin chỉ định được người ký:');
  for (const [id, lead] of orphanLeads) console.log(`  ${id}  projectLead "${lead}"`);
  console.log('');
}
if (drifts.length === 0 && orphanLeads.length === 0) {
  console.log('✅ Mọi section/register trong config đều có đủ dòng trong DB, và mọi Project Lead là user thật.\n');
  process.exit(0);
}
if (drifts.length === 0) {
  console.log('✅ Mọi section/register trong config đều có đủ dòng trong DB (xem cảnh báo Project Lead ở trên).\n');
  process.exit(1);
}

for (const d of drifts) {
  console.log(`  ${d.project}  ${d.kind.padEnd(11)} ${d.key.padEnd(26)} config ${String(d.config).padStart(3)} · db ${String(d.db).padStart(3)}`);
  for (const key of d.missing ?? []) console.log(`      thiếu: ${key}`);
}
console.log(
  `\n❌ ${drifts.length} chỗ lệch. Viết một migration bù dữ liệu, sinh các dòng TỪ CHÍNH config` +
    ` (xem 20260810041500 và 20260811071500 làm mẫu) — đừng gõ tay, để dự án cũ giống hệt dự án mới.\n`,
);
process.exit(1);
