// Traces which register columns each gate's readiness actually reads (software rule SW-5,
// docs/rules/Software_Rules.md).
//
// Why a trace and not a hand-written list: the checks are ~60 kinds, several of them
// bespoke (watch-list review, claim review, artwork claims…) and each one reads columns
// through helpers, behind conditions and through triggers. A list written by reading the
// code is wrong the first time a helper changes, and a wrong list is silent — a column
// missing from it is simply never frozen and never signed. So the list is MEASURED: every
// leaf check and every trigger is evaluated against many randomly filled projects while
// the rows are wrapped so that every property read is recorded.
//
// The result is checked in (src/config/registerColumnReads.ts) and `npm run verify:readiness`
// re-runs this trace and fails when the file is stale, so a changed check cannot go
// unnoticed. The random scenarios use a fixed seed and are therefore reproducible.
import { GATE_READINESS, type ReadinessCheck } from '../src/config/gateReadiness';
import { REGISTER_CONFIGS } from '../src/config/registers';
import { createEmptyProject, createEmptyRegisterRow } from '../../../apps/web/src/store/factory';
import { evaluateReadinessCheck, evaluateTrigger } from '../src/utils/gateProgress';
import type { NextAction, ProjectData, RegisterRow } from '../src/types';

export type ColumnReads = Record<string, Record<string, string[]>>;
// The top-level parts of a project other than registers that readiness may read.
const SLICE_KEYS = [
  'identity',
  'bom',
  'costing',
  'formulaProperties',
  'assessments',
  'studyApprovals',
  'marketTracks',
  'changes',
  'postLaunchReviews',
  'formulaVersionHistory',
] as const;

export interface TracedReads {
  // Which of SLICE_KEYS each gate reads (checks and triggers together — ownership of these is
  // fixed by the locks they already have, not by who reads them).
  slices: Record<string, string[]>;
  // What the gate's CHECKS read — the data the gate requires to be in a given state. Only
  // these decide which gate owns a column.
  checks: ColumnReads;
  // What the gate's TRIGGERS read — data consulted to decide whether an item applies at all
  // (Gate 12's "is a performance claim made?" reads the claim classification). A trigger
  // depends on a column but does not complete it, so it never takes ownership of one.
  triggers: ColumnReads;
}

const SCENARIOS = 120;

// mulberry32 — tiny, deterministic.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const leaves = (check: ReadinessCheck): ReadinessCheck[] =>
  check.kind === 'allOf' || check.kind === 'anyOf' ? check.checks.flatMap(leaves) : [check];

const IDENTITY = {
  id: 'T',
  productCode: 'T',
  projectLead: 'x',
  markets: ['Vietnam', 'Australia', 'Singapore'],
  reviewers: {},
} as never;

export function traceColumnReads(): { reads: TracedReads; errors: string[] } {
  const touched = new Map<string, Set<string>>(); // `${kind}|${gate}|${register}` -> columns
  const errors: string[] = [];
  const sliceTouched = new Map<string, Set<string>>(); // gate -> slice names
  const cur = { gate: '', kind: 'checks' as 'checks' | 'triggers' };
  const note = (register: string, column?: string) => {
    if (!cur.gate) return;
    const key = `${cur.kind}|${cur.gate}|${register}`;
    const set = touched.get(key) ?? touched.set(key, new Set()).get(key)!;
    if (column) set.add(column);
  };
  const wrapRow = (register: string, row: RegisterRow): RegisterRow =>
    new Proxy(row, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && !prop.startsWith('__')) note(register, prop);
        return Reflect.get(target, prop, receiver);
      },
    });
  const wrapRows = (register: string, rows: RegisterRow[]): RegisterRow[] =>
    new Proxy(rows.map((r) => wrapRow(register, r)), {
      get(target, prop, receiver) {
        // Reading the array at all (length, iteration, find…) is a read of the register's rows.
        note(register);
        return Reflect.get(target, prop, receiver);
      },
    });

  for (let scenario = 0; scenario < SCENARIOS; scenario++) {
    const random = rng(1000 + scenario);
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
    const project: ProjectData = createEmptyProject(IDENTITY);

    // A few Next Actions so a row can link one, in assorted states.
    const actions: NextAction[] = ['a1', 'a2', 'a3'].map((id) => ({
      id,
      gateId: pick(['SG02', 'SG04', 'SG07', 'SG10']),
      description: `action ${id}`,
      owner: pick(['Bob', '']),
      status: pick(['Open', 'In Progress', 'Closed', 'Cancelled']),
      priority: pick(['Low', 'Medium', 'High', 'Critical']),
    })) as NextAction[];
    project.nextActions = actions;

    const rawRegisters: Record<string, RegisterRow[]> = {};
    for (const cfg of REGISTER_CONFIGS) {
      const seeded = project.registers[cfg.key] ?? [];
      const base = cfg.mode === 'fixed' ? seeded : Array.from({ length: 1 + Math.floor(random() * 3) }, () => createEmptyRegisterRow(cfg.key));
      rawRegisters[cfg.key] = (base.length > 0 ? base : [createEmptyRegisterRow(cfg.key)]).map((seed) => {
        const row: RegisterRow = { ...seed };
        for (const column of cfg.columns) {
          if (cfg.mode === 'fixed' && column.editable === false) continue; // keep the seeded labels
          const r = random();
          if (r < 0.25) row[column.key] = '';
          else if (column.options && column.options.length > 0) row[column.key] = pick(column.options);
          else if (column.type === 'checkbox') row[column.key] = random() < 0.5;
          else if (column.type === 'number') row[column.key] = Math.floor(random() * 5);
          else if (column.key === 'linkedNextActionId') row[column.key] = pick(['a1', 'a2', 'a3', 'zz']);
          else if (column.key === 'claimId' || column.key === 'claimIds') row[column.key] = pick(['C-1', 'C-2', 'C-1, C-2']);
          else if (column.key === 'market') row[column.key] = pick(['Vietnam', 'Australia', 'Singapore']);
          else if (column.type === 'date') row[column.key] = '2026-01-01';
          else row[column.key] = pick(['x', 'some text', 'RM-1']);
        }
        return row;
      });
    }
    // A BOM so formula-scoped checks have lines to join against.
    project.bom = ['RM-1', 'RM-2'].map((rmCode, i) => ({
      rmCode,
      inciName: `INCI ${i}`,
      percent: 10,
      fromCosmetri: i === 0,
      reconciled: random() < 0.5,
    })) as never;
    // Randomise the target-user / claim-related checklist ticks the triggers read.
    for (const items of Object.values(project.checklists)) {
      for (const item of items) item.selected = random() < 0.3;
    }
    project.registers = Object.fromEntries(Object.entries(rawRegisters).map(([k, rows]) => [k, wrapRows(k, rows)])) as never;
    // Also random-fill the non-register parts, so a read behind a condition is reached.
    project.bom = project.bom.map((line) => ({ ...line, reconciled: random() < 0.5 }));
    project.marketTracks = (project.marketTracks ?? []).map((t) => ({ ...t, regulatoryStatus: pick(['Approved', 'Not Started', 'N/A']), launchApproval: pick(['Approved', 'Not Started']) })) as never;
    const traced: ProjectData = new Proxy(project, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && (SLICE_KEYS as readonly string[]).includes(prop) && cur.gate) {
          (sliceTouched.get(cur.gate) ?? sliceTouched.set(cur.gate, new Set()).get(cur.gate)!).add(prop);
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    for (const [gate, requirements] of Object.entries(GATE_READINESS)) {
      cur.gate = gate;
      for (const requirement of requirements) {
        cur.kind = 'checks';
        for (const leaf of leaves(requirement.check)) {
          try {
            evaluateReadinessCheck(traced, leaf, gate);
          } catch (error) {
            errors.push(`${gate} ${requirement.id} ${leaf.kind}: ${(error as Error).message.slice(0, 80)}`);
          }
        }
        // A trigger decides whether the item applies, so what it reads is part of what the
        // gate reads — and an inactive trigger returns early in the real engine, which is
        // exactly why the leaf check alone would hide those reads.
        if (requirement.trigger) {
          cur.kind = 'triggers';
          try {
            evaluateTrigger(traced, requirement.trigger);
          } catch (error) {
            errors.push(`${gate} ${requirement.id} trigger ${requirement.trigger}: ${(error as Error).message.slice(0, 80)}`);
          }
        }
      }
    }
  }

  const reads: TracedReads = { checks: {}, triggers: {}, slices: {} };
  for (const [gate, names] of [...sliceTouched].sort(([x], [y]) => x.localeCompare(y))) reads.slices[gate] = [...names].sort();
  for (const [key, columns] of [...touched].sort(([x], [y]) => x.localeCompare(y))) {
    const [kind, gate, register] = key.split('|') as ['checks' | 'triggers', string, string];
    (reads[kind][gate] ??= {})[register] = [...columns].sort();
  }
  return { reads, errors: [...new Set(errors)] };
}

function renderBlock(name: string, reads: ColumnReads): string {
  const gates = Object.keys(reads).sort();
  const body = gates
    .map((gate) => {
      const registers = Object.keys(reads[gate]).sort();
      const lines = registers.map((register) => `    ${register}: [${reads[gate][register].map((c) => `'${c}'`).join(', ')}],`);
      return `  ${gate}: {\n${lines.join('\n')}\n  },`;
    })
    .join('\n');
  return `export const ${name}: Record<string, Record<string, string[]>> = {\n${body}\n};\n`;
}

function renderSlices(slices: Record<string, string[]>): string {
  const body = Object.keys(slices)
    .sort()
    .map((gate) => `  ${gate}: [${slices[gate].map((n) => `'${n}'`).join(', ')}],`)
    .join('\n');
  return `// The parts of a project other than registers (BOM, costing, assessments…) each gate's readiness reads.
export const PROJECT_SLICE_READS_BY_GATE: Record<string, string[]> = {\n${body}\n};\n`;
}

export function renderColumnReadsFile(reads: TracedReads): string {
  return `// GENERATED by packages/shared/scripts/generate-column-reads.ts — do not edit by hand.
//
// For each gate, every register its readiness reads and, per register, the columns it
// reads (an empty list means only the rows themselves are read: "has at least one row").
// Measured by tracing the real checks over many random projects; see column-reads-lib.ts
// for why it is measured rather than written. \`npm run verify:readiness\` fails when this
// file no longer matches a fresh trace — regenerate with \`npm run generate:column-reads\`.
//
// REGISTER_READS_BY_GATE is what the gate's CHECKS read: it decides which gate owns a column.
// TRIGGER_READS_BY_GATE is what its TRIGGERS read to decide whether an item applies: those
// columns are part of what the gate's signature records, but a trigger never owns a column.
${renderBlock('REGISTER_READS_BY_GATE', reads.checks)}
${renderBlock('TRIGGER_READS_BY_GATE', reads.triggers)}
${renderSlices(reads.slices)}`;
}
