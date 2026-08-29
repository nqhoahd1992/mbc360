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
 *   S5 — a Round-4 question may not be ticked ✅ resolved in the roadmap's
 *        tracking table while a decision site still carries an `R4-REWORK`
 *        marker naming it. Added 2026-08-24, when the project owner asked that
 *        finished questions be marked resolved: a tick nobody can contradict is
 *        the same manual bookkeeping that has drifted here four times, so the
 *        tick is checked against the markers rather than trusted.
 *
 * It also prints four debt counters — `manual` checks · Conditional items with no
 * trigger · triggers that cannot yet answer "not yet assessed"
 * (`TRIGGERS_WITHOUT_UNASSESSED_STATE`, Round 4 question 7) · open
 * `[ASSUMPTION: Rn-Qm]` tags and unfixed `R4-REWORK` sites — verifies that every
 * assumption tag points at a question that actually exists in
 * docs/rules/F1_Per_Gate_Open_Questions.md, and reports Round-4 progress as
 * resolved-out-of-36.
 *
 * The counters deliberately do NOT fail the build. Each one measures work that is
 * known, disclosed and scheduled; failing on it would only motivate deleting the
 * thing being counted, which is the opposite of what it is for.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  GATE_READINESS,
  TRIGGERS_WITHOUT_UNASSESSED_STATE,
  type ReadinessCheck,
  type ReadinessRequirement,
} from '../src/config/gateReadiness';
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
  // `anyOf` flattens the same way (2026-08-29): a reference typo inside one is
  // exactly as silent as inside an `allOf`, so both composites are walked.
  return check.kind === 'allOf' || check.kind === 'anyOf' ? check.checks.flatMap(leafChecks) : [check];
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

const declaredExemptions: { gate: string; id: string; why: string }[] = [];

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
    // Round 4 question 31(f) (2026-08-29) gave those two kinds a `scope`. With
    // `scope: 'formula'` the pairing above proves nothing — a register full of
    // candidate rows says nothing about whether the FORMULA has any — so the
    // registerHasRows route is closed for them and only a declared
    // `nonVacuousBecause` is accepted. Left implicit, this would have been the
    // sweep reporting clean on three release gates whose reasoning had moved.
    const formulaScoped = !!impliedRegister && (check as { scope?: string }).scope === 'formula';
    const vacuous =
      !!impliedRegister ||
      check.kind === 'registerColumnFilled' ||
      check.kind === 'registerNoBadRows' ||
      (check.kind === 'registerRowsComplete' && !!check.when);
    if (!vacuous) continue;

    const register = impliedRegister ?? (check as { register: string }).register;
    if (getRegisterConfig(register)?.mode === 'fixed') continue; // rows seeded at creation

    // A DECLARED exemption: the item says in words what makes it non-vacuous when
    // the sweep cannot see it. Collected and printed below rather than silently
    // skipped, so an exemption stays visible in every run.
    if (req.nonVacuousBecause) {
      // One line per ITEM, not per leg: an allOf with two scoped legs is one
      // exemption, and printing it twice makes the list look longer than it is.
      if (!declaredExemptions.some((e) => e.gate === gate && e.id === req.id)) {
        declaredExemptions.push({ gate, id: req.id, why: req.nonVacuousBecause });
      }
      continue;
    }

    const guarded =
      !formulaScoped &&
      guards.some(
        (g) =>
          (g.check as { register: string }).register === register &&
          gateOrder(g.gate) <= gateOrder(gate),
      );
    if (!guarded) {
      fail(
        'S2',
        gate,
        req.id,
        formulaScoped
          ? `${check.kind}("${register}", scope: 'formula') không thể dựa vào registerHasRows — ` +
              `phải khai \`nonVacuousBecause\` nói rõ điều gì khiến nó không tự thoả`
          : `${check.kind}("${register}") không có Mandatory registerHasRows đi kèm ` +
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

// Confirmed-but-not-yet-built debt. An `[ASSUMPTION: Rn-Qm]` tag says "we guessed
// and nobody has confirmed it"; once the answer arrives that tag has to go, and if
// the answer CONTRADICTS the code, removing it would leave a known-wrong decision
// site with no marker at all — strictly worse than the open assumption it replaced.
// So closure rewrites those sites to an `R4-REWORK` marker naming the sent
// question number, and this counts them every run for the same reason the two
// counters above exist: an unmeasured debt is one that drifts.
//
// A marker names the question as it was SENT (1-36), not the internal `R4-Qn` id,
// because that is the number the reply is written against and the number the
// roadmap's tracking table uses. Forms accepted:
//
//   R4-REWORK: câu 11          one question
//   R4-REWORK: câu 31(f)       one question, sub-part named for the reader
//   R4-REWORK: câu 18+29       one site that two questions both govern
//
// Anything in parentheses is a sub-part label, never a question number — `câu
// 27(1)(2)(3)` is question 27, not questions 1, 2 and 3.
function reworkByQuestion(): Map<number, { count: number; files: Set<string> }> {
  const byQuestion = new Map<number, { count: number; files: Set<string> }>();
  for (const dir of TAG_SCAN_DIRS) {
    for (const file of walk(join(REPO_ROOT, dir))) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\[R4-REWORK: câu (\d+(?:\+\d+)*)/g)) {
        for (const part of m[1].split('+')) {
          const n = Number(part);
          const entry = byQuestion.get(n) ?? { count: 0, files: new Set<string>() };
          entry.count += 1;
          entry.files.add(relative(REPO_ROOT, file));
          byQuestion.set(n, entry);
        }
      }
    }
  }
  return byQuestion;
}

// S5 — the Round-4 tracking table in the roadmap is the one place that says which
// of the 36 questions is DONE, and this keeps that claim honest.
//
// Marking a question resolved is a human act, so on its own it is exactly the kind
// of manual bookkeeping this repo has watched drift four times. What makes it
// checkable is that the two records have to agree: a question cannot be resolved
// while a decision site still carries an `R4-REWORK` marker naming it. That turns
// "resolved" from a claim into a consequence — you clear the markers, then you may
// tick the row, and ticking it early fails the build.
//
// The reverse is deliberately NOT enforced. A question with zero markers is not
// automatically done: at closure 10 of the 36 had none — 3, 12, 13, 14, 15, 16,
// 17, 20, 26, 28 — because they are new build with no existing wrong code to mark.
// Zero markers is their starting state, not their finish line, so only a person
// can say the work is complete.
const ROADMAP_DOC = 'docs/plans/Round4_Implementation_Roadmap.md';
const TRACKING_HEADING = '## Bảng theo dõi 36 câu';
const RESOLVED_MARK = '✅';
const SENT_QUESTION_COUNT = 36;

function verifyRound4Tracking(rework: Map<number, { count: number; files: Set<string> }>): {
  resolved: Set<number>;
  total: number;
} {
  const doc = readFileSync(join(REPO_ROOT, ROADMAP_DOC), 'utf8');
  const resolved = new Set<number>();
  const seen = new Set<number>();

  // Read ONLY the tracking section. The roadmap has other tables whose first
  // column is also a number — the per-gate table in nhóm 7 is a list of gates, and
  // nhóm 1's lists question numbers as examples — so a document-wide row regex
  // picks them up and reports phantom duplicates. Scope to the section, then parse.
  const start = doc.indexOf(TRACKING_HEADING);
  if (start === -1) {
    fail('S5', '—', 'bảng theo dõi', `không tìm thấy mục "${TRACKING_HEADING}" trong ${ROADMAP_DOC}`);
    return { resolved, total: SENT_QUESTION_COUNT };
  }
  const rest = doc.slice(start + TRACKING_HEADING.length);
  const end = rest.search(/^#{1,2} /m);
  const section = end === -1 ? rest : rest.slice(0, end);

  // Rows of the tracking table: `| 20 | — | ✅ resolved | … |`
  for (const m of section.matchAll(/^\| *(\d+) *\| *([^|]*?) *\| *([^|]*?) *\|/gm)) {
    const n = Number(m[1]);
    if (n < 1 || n > SENT_QUESTION_COUNT) continue;
    if (seen.has(n)) {
      fail('S5', '—', `câu ${n}`, `xuất hiện nhiều lần trong bảng theo dõi của ${ROADMAP_DOC}`);
      continue;
    }
    seen.add(n);
    if (m[3].includes(RESOLVED_MARK)) resolved.add(n);
  }

  for (let n = 1; n <= SENT_QUESTION_COUNT; n += 1) {
    if (!seen.has(n)) fail('S5', '—', `câu ${n}`, `thiếu trong bảng theo dõi của ${ROADMAP_DOC}`);
  }

  for (const n of resolved) {
    const debt = rework.get(n);
    if (debt) {
      fail(
        'S5',
        '—',
        `câu ${n}`,
        `đánh dấu ✅ resolved nhưng còn ${debt.count} chỗ [R4-REWORK: câu ${n}] chưa sửa: ${[...debt.files].sort().join(', ')}`,
      );
    }
  }

  return { resolved, total: SENT_QUESTION_COUNT };
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
// Round 4 question 7: a trigger that cannot answer "not yet assessed" still reads
// an empty source as a considered no, which is the behaviour the answer rejects.
// No sweep is needed to catch a typo here — the array is typed `ReadinessTrigger[]`,
// so the compiler already does that. What it cannot see is the list going stale,
// which is what printing it every run is for. Empty = R5-Q5 fully discharged.
console.log(
  `Trigger chưa có "chưa xét"    : ${TRIGGERS_WITHOUT_UNASSESSED_STATE.length}  ${TRIGGERS_WITHOUT_UNASSESSED_STATE.join(', ')}`,
);
console.log(`Giả định chờ SME             : ${assumptions.ids.size} câu hỏi, ${assumptions.tagged} chỗ được gắn dấu`);

const rework = reworkByQuestion();
const tracking = verifyRound4Tracking(rework);
let reworkSites = 0;
for (const { count } of rework.values()) reworkSites += count;
const openWithDebt = [...rework.entries()]
  .filter(([n]) => !tracking.resolved.has(n))
  .sort((a, b) => b[1].count - a[1].count || a[0] - b[0]);

console.log(
  `Vòng 4 đã resolve            : ${tracking.resolved.size}/${tracking.total} câu` +
    (tracking.resolved.size > 0 ? `  (${[...tracking.resolved].sort((a, b) => a - b).join(', ')})` : ''),
);
console.log(`Đã chốt nhưng chưa sửa       : ${reworkSites} chỗ R4-REWORK trên ${openWithDebt.length} câu`);
if (openWithDebt.length > 0) {
  console.log(`                               ${openWithDebt.map(([n, d]) => `câu ${n}×${d.count}`).join(' · ')}`);
}

if (declaredExemptions.length > 0) {
  console.log(`\n--- Miễn trừ S2 đã khai (${declaredExemptions.length}) ---`);
  for (const e of declaredExemptions) console.log(`  ${e.gate} ${e.id}: ${e.why}`);
}

if (notes.length > 0) {
  console.log('\n--- Ghi nhận (không phải lỗi) ---');
  for (const n of notes) console.log(`  ${n}`);
}

if (failures.length === 0) {
  console.log(
    '\n✅ S1 (tên tham chiếu) · S2 (register rỗng) · S3 (giá trị seed) · S4 (dev-decision đã hỏi) · S5 (resolve Vòng 4) · TAG (giả định): sạch\n',
  );
  process.exit(0);
}

console.log(`\n❌ ${failures.length} lỗi:\n`);
for (const f of failures) console.log(`  [${f.sweep}] ${f.gate} ${f.id}\n        ${f.detail}`);
console.log('');
process.exit(1);
