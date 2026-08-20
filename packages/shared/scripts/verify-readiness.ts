/**
 * Gate-readiness config verification sweeps.
 *
 *   npx tsx packages/shared/scripts/verify-readiness.ts
 *
 * Exits non-zero on any failure, so it can be wired into CI.
 *
 * Why this exists: the failure modes below are invisible at runtime — they do
 * not throw, they silently make a gate either impossible to pass or trivial to
 * pass. All three have already happened in this repo; S1 and S2 were caught by
 * manual review passes, S3 shipped. This script replaces those passes so the
 * checks re-run on every config change instead of whenever someone remembers.
 *
 *   S1 — a mistyped register/column/section/requirement/gate-check name (or a
 *        `badValues` entry that is not one of the column's own options) makes a
 *        Mandatory check permanently unsatisfiable: the gate can never pass and
 *        nothing reports why.
 *   S2 — `registerColumnFilled` / `registerNoBadRows` use `.every()`, which is
 *        vacuously true on an EMPTY register: the check passes before anyone
 *        has entered a single row.
 *   S3 — the mirror image, and the one that actually shipped (Gate 7,
 *        2026-08-07): on a `mode: 'fixed'` register the rows are seeded at
 *        project creation, so the SEEDED values decide the check. All-seeded-bad
 *        blocks every project from day one; an always-filled column can never
 *        fail. S2 deliberately exempts fixed registers, which is exactly why S3
 *        has to exist — 8 of the 10 checks in scope sit on fixed registers.
 *
 *   S4 — an item whose `source` is `'dev-decision'` (it exists only on our own
 *        reading, yet hard-blocks a gate) must declare the `assumption` question
 *        it rests on. Added 2026-08-11, after all four such items were found to
 *        have shipped without ever being put to the team.
 *
 * It also prints two debt counters (`manual` checks, open `[ASSUMPTION: Rn-Qm]`
 * tags) and verifies that every assumption tag points at a question that
 * actually exists in docs/rules/F1_Per_Gate_Open_Questions.md.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { GATE_READINESS, type ReadinessCheck, type ReadinessRequirement } from '../src/config/gateReadiness';
import { PHASE_CONFIGS } from '../src/config/phases';
import { getRegisterConfig } from '../src/config/registers';
import { RM_EVIDENCE_REGISTER } from '../src/utils/rmEvidence';
import { NO_VULNERABLE_GROUP, TARGET_USER_TO_VULNERABLE_GROUP } from '../src/config/vulnerableGroups';

const REPO_ROOT = join(__dirname, '..', '..', '..');
const QUESTIONS_DOC = 'docs/rules/F1_Per_Gate_Open_Questions.md';
// Scanned for `[ASSUMPTION: Rn-Qm]` tags. Keep in sync with where decisions live.
const TAG_SCAN_DIRS = ['docs', 'packages/shared/src', 'apps/web/src', 'apps/api/src'];

interface Failure {
  sweep: string;
  gate: string;
  id: string;
  detail: string;
}
const failures: Failure[] = [];
// Non-failing observations worth printing — e.g. an S3 case that is intentional.
const notes: string[] = [];
const fail = (sweep: string, gate: string, id: string, detail: string) =>
  failures.push({ sweep, gate, id, detail });

// `allOf` nests; every sweep below reasons about leaf checks.
function leafChecks(check: ReadinessCheck): ReadinessCheck[] {
  return check.kind === 'allOf' ? check.checks.flatMap(leafChecks) : [check];
}

interface Entry {
  gate: string;
  req: ReadinessRequirement;
  check: ReadinessCheck;
}
const entries: Entry[] = [];
for (const [gate, reqs] of Object.entries(GATE_READINESS)) {
  for (const req of reqs) for (const check of leafChecks(req.check)) entries.push({ gate, req, check });
}

// ---------------------------------------------------------------------------
// S1 — every name a check references must exist in config
// ---------------------------------------------------------------------------

const checklistSections = new Set<string>();
const requirementRows = new Map<string, Set<string>>(); // section key -> requirement labels
const gateChecks = new Set<string>(); // `${gate}::${check}`
for (const phase of Object.values(PHASE_CONFIGS)) {
  for (const s of phase.checklistSections) checklistSections.add(s.key);
  for (const s of phase.requirementSections) {
    requirementRows.set(s.key, new Set(s.rows.map((r) => r.requirement)));
  }
  for (const c of phase.keyGateChecks) gateChecks.add(`${c.gate}::${c.check}`);
}

function verifyNames({ gate, req, check }: Entry): void {
  const id = req.id;
  switch (check.kind) {
    case 'registerHasRows':
    case 'registerColumnFilled':
    case 'registerNoBadRows':
    case 'registerRowsComplete': {
      const config = getRegisterConfig(check.register);
      if (!config) {
        fail('S1', gate, id, `register "${check.register}" không tồn tại trong REGISTER_CONFIGS`);
        return;
      }
      const known = new Set(config.columns.map((c) => c.key));
      const referenced =
        check.kind === 'registerRowsComplete' ? check.columns : 'column' in check ? [check.column] : [];
      for (const col of referenced) {
        if (!known.has(col)) {
          fail('S1', gate, id, `register "${check.register}" không có cột "${col}"`);
        }
      }
      // A `badValues` entry that is not one of the column's own options can
      // never match — same silent-failure class as a mistyped column name.
      if (check.kind === 'registerNoBadRows') {
        const options = config.columns.find((c) => c.key === check.column)?.options;
        if (options) {
          for (const bad of check.badValues) {
            if (!options.includes(bad)) {
              fail('S1', gate, id, `badValue "${bad}" không nằm trong options của "${check.column}"`);
            }
          }
        }
      }
      return;
    }
    case 'checklistHasSelection':
      if (!checklistSections.has(check.section)) {
        fail('S1', gate, id, `checklist section "${check.section}" không tồn tại`);
      }
      return;
    case 'requirementDone': {
      const rows = requirementRows.get(check.section);
      if (!rows) {
        fail('S1', gate, id, `requirement section "${check.section}" không tồn tại`);
        return;
      }
      if (!rows.has(check.requirement)) {
        fail('S1', gate, id, `section "${check.section}" không có dòng "${check.requirement}"`);
      }
      return;
    }
    case 'gateCheckDone':
      if (!gateChecks.has(`${check.gate}::${check.check}`)) {
        fail('S1', gate, id, `Key Gate Check (gate ${check.gate}) "${check.check}" không tồn tại`);
      }
      return;
    case 'gateFieldFilled':
      if (!GATE_READINESS[`SG${check.gate}`]) {
        fail('S1', gate, id, `gate "${check.gate}" không hợp lệ`);
      }
      return;
    case 'vulnerableGroupsCovered': {
      // The mapping is two lists of strings joined by hand, so a rename on either
      // side silently disables it — exactly the S1 failure class. Both ends must
      // resolve: the key against the Gate 02 target-user options, the value
      // against the register column's own options.
      const targetUsers = new Set(
        Object.values(PHASE_CONFIGS)
          .flatMap((c) => c.checklistSections)
          .find((s) => s.key === 'targetUsers')?.options ?? [],
      );
      const groups = new Set(
        getRegisterConfig('vulnerableUserAssessment')?.columns.find((c) => c.key === 'vulnerableGroup')?.options ?? [],
      );
      for (const [user, group] of Object.entries(TARGET_USER_TO_VULNERABLE_GROUP)) {
        if (!targetUsers.has(user)) {
          fail('S1', gate, id, `map: target user "${user}" không tồn tại trong checklist targetUsers`);
        }
        if (!groups.has(group)) {
          fail('S1', gate, id, `map: vulnerable group "${group}" không nằm trong options của cột vulnerableGroup`);
        }
      }
      if (!groups.has(NO_VULNERABLE_GROUP)) {
        fail('S1', gate, id, `NO_VULNERABLE_GROUP "${NO_VULNERABLE_GROUP}" không nằm trong options của cột vulnerableGroup`);
      }
      return;
    }
    default:
      return; // manual / skincareForTwo / nextActionsClosed / bom* — no names to check
  }
}

// ---------------------------------------------------------------------------
// S2 — no Mandatory check may be vacuously satisfied on an empty register
// ---------------------------------------------------------------------------
//
// `registerColumnFilled` and `registerNoBadRows` both reduce with `.every()` /
// `.some()` over the register's rows, so on an EMPTY register they report
// "satisfied". Safe only if something else guarantees rows exist:
//   - a Mandatory `registerHasRows` on the same register, at the same gate or
//     an earlier one (so it cannot be satisfied later than the check it guards);
//   - or `mode: 'fixed'`, whose rows are seeded at project creation.
// `registerRowsComplete` is non-vacuous by design and needs no pairing.

const gateOrder = (gate: string) => Number(gate.replace('SG', ''));

function verifyVacuity(): void {
  const guards = entries.filter(
    (e) => e.req.tier === 'Mandatory' && e.check.kind === 'registerHasRows',
  );
  for (const entry of entries) {
    const { gate, req, check } = entry;
    if (req.tier !== 'Mandatory') continue;
    // `registerRowsComplete` is normally non-vacuous (an empty register fails it
    // by construction) — EXCEPT with a `when` clause, added 2026-08-11, where a
    // register whose rows are all skipped has nothing left to fail on. That
    // variant needs the same pairing as the two below.
    // The two D4 kinds (2026-08-12) filter a register and assert the result is
    // empty, so they are vacuous in exactly the same way — and they carry their
    // register in the kind rather than in a field, which is why they have to be
    // named here. Without this the sweep reported clean on them while all three
    // gate-7/10/11 items passed on an empty Supplier & RM Evidence register; the
    // pairing that saves them is `sg04-supplier`'s registerHasRows at the earlier
    // gate, which is exactly the relationship S2 exists to check rather than leave
    // to whoever wrote the check having thought about it.
    const impliedRegister =
      check.kind === 'rmEvidenceDispositioned' || check.kind === 'rmEvidenceNoneConditional'
        ? RM_EVIDENCE_REGISTER
        : undefined;
    const vacuous =
      !!impliedRegister ||
      check.kind === 'registerColumnFilled' ||
      check.kind === 'registerNoBadRows' ||
      (check.kind === 'registerRowsComplete' && !!check.when);
    if (!vacuous) continue;

    const register = impliedRegister ?? (check as { register: string }).register;
    if (getRegisterConfig(register)?.mode === 'fixed') continue; // rows seeded at creation

    const guarded = guards.some(
      (g) =>
        (g.check as { register: string }).register === register &&
        gateOrder(g.gate) <= gateOrder(gate),
    );
    if (!guarded) {
      fail(
        'S2',
        gate,
        req.id,
        `${check.kind}("${register}") không có Mandatory registerHasRows đi kèm ` +
          `(cùng gate hoặc sớm hơn) — sẽ tự thoả trên register rỗng`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// S3 — a `mode: 'fixed'` register's SEEDED values must not decide the check
// ---------------------------------------------------------------------------
//
// S2 exempts fixed registers because their rows are seeded at project creation,
// so they can never be empty. But that exemption hides the opposite hazard, and
// it is the one that actually shipped (Gate 7, 2026-08-07): `pbCautionLimits`
// seeds all 12 rows at `productStatus: 'Not assessed'`, which was in that
// check's `badValues` — so the check was unsatisfiable on a brand-new project
// and hard-blocked EVERY product until someone walked the whole register.
//
// Two directions, only one of which is a defect:
//   - every seeded value is BAD  -> the check blocks from creation. A defect for
//     an unconditional Mandatory item; by design for a Conditional item whose
//     trigger gates it (that is exactly what the Gate 7 fix turned it into).
//   - no seeded value is bad -> satisfied from creation. NOT reported: for a
//     `registerNoBadRows` check that is the correct meaning ("no bad finding
//     recorded yet"), so flagging it would be noise.
// For `registerColumnFilled`, a column already filled in every seeded row means
// the check can never fail — always a defect.

const seededValue = (row: Record<string, unknown>, column: string) => String(row[column] ?? '').trim();

function verifySeededFixedRows(): void {
  for (const { gate, req, check } of entries) {
    if (check.kind !== 'registerNoBadRows' && check.kind !== 'registerColumnFilled') continue;
    const config = getRegisterConfig(check.register);
    if (config?.mode !== 'fixed') continue;
    const rows = config.fixedRows ?? [];
    if (rows.length === 0) continue;

    if (check.kind === 'registerNoBadRows') {
      const allSeededBad = rows.every((r) => check.badValues.includes(seededValue(r, check.column)));
      if (!allSeededBad) continue;
      const detail =
        `mọi dòng seed của "${check.register}" có ${check.column} nằm trong badValues ` +
        `-> check KHÔNG thoả được trên dự án mới`;
      if (req.tier === 'Mandatory' && !req.trigger) {
        fail('S3', gate, req.id, `${detail}; item Mandatory không điều kiện -> chặn MỌI dự án ngay từ khi tạo`);
      } else {
        notes.push(`[S3] ${gate} ${req.id}: ${detail} — chấp nhận được vì tier=${req.tier}${req.trigger ? ` trigger=${req.trigger}` : ''}`);
      }
    } else {
      const alwaysFilled = rows.every((r) => seededValue(r, check.column) !== '');
      if (alwaysFilled) {
        fail(
          'S3',
          gate,
          req.id,
          `cột "${check.column}" đã có giá trị ở mọi dòng seed của "${check.register}" ` +
            `-> check tự thoả ngay khi tạo dự án, không bao giờ fail được`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Assumption tags — every [ASSUMPTION: Rn-Qm] must point at a real question
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|md)$/.test(name)) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// S4 — every `source: 'dev-decision'` item must declare the open question it
// rests on. Such an item hard-blocks a gate on nothing but our own reading, so
// leaving it unasked contradicts the standing working agreement. Found
// 2026-08-11: all four dev-decision items had shipped for weeks, with the panel
// truthfully printing "not SME-confirmed" next to each, while none of them
// appeared in any round sent to the team.
// ---------------------------------------------------------------------------

function verifyDevDecisionsAsked(defined: Set<string>): void {
  for (const { gate, req } of Object.entries(GATE_READINESS).flatMap(([gate, reqs]) =>
    reqs.map((req) => ({ gate, req })),
  )) {
    if (req.source !== 'dev-decision') continue;
    if (!req.assumption) {
      fail('S4', gate, req.id, "source: 'dev-decision' nhưng thiếu `assumption` — quyết định của dev đang chặn gate mà chưa hỏi SME");
    } else if (!defined.has(req.assumption)) {
      fail('S4', gate, req.id, `assumption: '${req.assumption}' không tồn tại trong ${QUESTIONS_DOC}`);
    }
  }
}

function verifyAssumptions(): { tagged: number; ids: Set<string> } {
  const doc = readFileSync(join(REPO_ROOT, QUESTIONS_DOC), 'utf8');
  // Any round, not just Round 4 — the sweep silently ignored an `R5-Q1` tag
  // when this was hardcoded to R4, which is the one failure mode it exists to
  // prevent (2026-08-20).
  const defined = new Set(doc.match(/^#### (R\d+-Q\d+)/gm)?.map((m) => m.replace('#### ', '')) ?? []);
  const used = new Set<string>();
  let tagged = 0;

  verifyDevDecisionsAsked(defined);
  // An id declared only through a `assumption` field still counts as tagged, so
  // the "every question is referenced somewhere" rule below stays satisfiable
  // without a duplicate comment tag.
  for (const reqs of Object.values(GATE_READINESS)) {
    for (const req of reqs) {
      if (req.assumption) used.add(req.assumption);
    }
  }

  for (const dir of TAG_SCAN_DIRS) {
    for (const file of walk(join(REPO_ROOT, dir))) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\[ASSUMPTION: (R\d+-Q\d+)\]/g)) {
        tagged++;
        used.add(m[1]);
        if (!defined.has(m[1])) {
          fail('TAG', '—', relative(REPO_ROOT, file), `trỏ tới ${m[1]} nhưng câu hỏi đó không tồn tại`);
        }
      }
    }
  }
  for (const id of defined) {
    if (!used.has(id)) {
      fail('TAG', '—', QUESTIONS_DOC, `${id} được định nghĩa nhưng không chỗ nào gắn [ASSUMPTION: ${id}]`);
    }
  }
  return { tagged, ids: defined };
}

// ---------------------------------------------------------------------------

for (const entry of entries) verifyNames(entry);
verifyVacuity();
verifySeededFixedRows();
const assumptions = verifyAssumptions();

// Debt counters — not failures, but printed every run so they cannot drift
// unnoticed. `manual` = declared by the SME but with no data source wired yet.
const items = Object.entries(GATE_READINESS).flatMap(([gate, reqs]) => reqs.map((req) => ({ gate, req })));
const byTier = items.reduce<Record<string, number>>((acc, { req }) => {
  acc[req.tier] = (acc[req.tier] ?? 0) + 1;
  return acc;
}, {});
const manual = items.filter(({ req }) => leafChecks(req.check).some((c) => c.kind === 'manual'));
const conditionalNoTrigger = items.filter(({ req }) => req.tier === 'Conditional' && !req.trigger);

console.log('\n=== Gate readiness verification ===');
console.log(`Items      : ${items.length} (${Object.entries(byTier).map(([t, n]) => `${t} ${n}`).join(' · ')})`);
console.log(`Checks     : ${entries.length} leaf (allOf đã trải phẳng)`);
console.log('\n--- Nợ kỹ thuật (không phải lỗi) ---');
console.log(`manual                       : ${manual.length}  ${manual.map((m) => m.req.id).join(', ')}`);
console.log(`Conditional chưa có trigger  : ${conditionalNoTrigger.length}  ${conditionalNoTrigger.map((m) => m.req.id).join(', ')}`);
console.log(`Giả định chờ SME             : ${assumptions.ids.size} câu hỏi, ${assumptions.tagged} chỗ được gắn dấu`);

if (notes.length > 0) {
  console.log('\n--- Ghi nhận (không phải lỗi) ---');
  for (const n of notes) console.log(`  ${n}`);
}

if (failures.length === 0) {
  console.log('\n✅ S1 (tên tham chiếu) · S2 (register rỗng) · S3 (giá trị seed) · S4 (dev-decision đã hỏi) · TAG (giả định): sạch\n');
  process.exit(0);
}

console.log(`\n❌ ${failures.length} lỗi:\n`);
for (const f of failures) console.log(`  [${f.sweep}] ${f.gate} ${f.id}\n        ${f.detail}`);
console.log('');
process.exit(1);
