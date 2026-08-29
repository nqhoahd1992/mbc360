// The gate-scoped evidence snapshot a signature attests to (Round 4 question
// 29(1), built 2026-08-29).
//
// The answer rules out the obvious cheap option in its own words — "a project-wide
// save counter is not sufficient" — which is exactly what the phase sign-off's
// `recordVersion` (`projects.version`) is. A counter can say something changed; it
// cannot say WHAT, and the answer requires "the system identifies what changed".
// So a snapshot is stored in full and diffed, not hashed.
//
// The eight components the answer lists map onto ProjectData like this:
//   gate status + proposed decision      -> the GateRecord's status, plus each
//                                           signature's own recorded decision —
//                                           see the note on GateEvidenceSnapshot
//                                           for why the gate record's `decision`
//                                           is deliberately NOT in here
//   gate checks                          -> gateChecks rows for this gate
//   applicable checklist results         -> checklist sections and requirement
//                                           rows tagged with this gate
//   mandatory / triggered register state -> a digest of every register the gate's
//                                           readiness rules read
//   evidence links + document revisions  -> the gate's own link
//   open actions and conditions          -> openNextActions for this gate
//   formula version where relevant       -> project.formulaVersion
//   market + artwork version where rel.  -> the lane's market + artwork register
//
// Deliberately NOT the readiness engine's verdict list, although that would have
// been the shortest route to "applicable checklist results": the snapshot would
// then contain the sign-off item itself, and deciding whether a gate is signed off
// would require evaluating a snapshot that answers that very question. Reading the
// underlying records directly has no such loop, and it is closer to what the
// answer names — evidence, not our conclusion about it.
//
// The BOUNDARY is a judgement: everything the readiness engine reads for this
// gate, plus the six extras above — not the whole project, and not every register
// in the app. A narrower snapshot would let evidence change under a signature; a
// wider one would invalidate signatures for edits to gates that have nothing to
// do with this one [ASSUMPTION: R5-Q7].
import type { GateEvidenceSnapshot, ProjectData, RegisterRow } from '../types';
import { GATE_READINESS, type ReadinessCheck } from '../config/gateReadiness';
import { PHASE_CONFIGS } from '../config/phases';
import { REGISTER_CONFIGS } from '../config/registers';
import { NEXT_ACTION_TERMINAL_STATUSES } from '../types';

// Deliberately NOT imported from gateProgress, which is a one-line filter there:
// gateProgress reads THIS module (the `gateSignedOff` check needs the snapshot to
// decide staleness), and a module cycle that happens to work because both sides
// only touch each other inside function bodies is a trap for whoever edits it
// next.

const ARTWORK_REGISTER = 'packagingSpecsArtwork';

// Every register key the gate's own readiness checks read. Walked through `allOf`,
// because a merged item hides its legs behind one entry.
function registersReadAtGate(gateId: string): string[] {
  const keys = new Set<string>();
  const walk = (check: ReadinessCheck): void => {
    if (check.kind === 'allOf') {
      check.checks.forEach(walk);
      return;
    }
    if ('register' in check && typeof check.register === 'string') keys.add(check.register);
  };
  for (const req of GATE_READINESS[gateId] ?? []) walk(req.check);
  return [...keys];
}

// A register reduced to one stable string. Column order comes from CONFIG, not
// from the row's own key order, so re-saving a row cannot look like a change just
// because the JSON came back with its keys shuffled.
function digestRegister(config: { columns: { key: string }[] } | undefined, rows: RegisterRow[]): string {
  const columns = config?.columns.map((c) => c.key) ?? [];
  return rows
    .map((row) =>
      (columns.length > 0 ? columns : Object.keys(row).sort())
        .map((key) => `${key}=${String(row[key] ?? '')}`)
        .join('|'),
    )
    .join('\n');
}

// Checklist sections whose own gate is this one, each reduced to which options are
// ticked and at what status. A section is included by its CONFIG gate, so a
// section that moves gate cannot silently drop out of a signature's scope.
function digestChecklists(project: ProjectData, gateNumber: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const config of Object.values(PHASE_CONFIGS)) {
    for (const section of config.checklistSections) {
      if (section.gate !== gateNumber) continue;
      out[section.key] = (project.checklists[section.key] ?? [])
        .map((i) => `${i.label}=${i.selected ? 'Y' : 'N'}/${i.status}/${i.isPrimary ? 'P' : ''}/${i.evidenceLink ?? ''}`)
        .join('|');
    }
  }
  return out;
}

// Requirement ROWS tagged with this gate — not whole sections, because a single
// section can span several gates (Phase 3's compartments are all gate 07, but
// `infantTesting` is 08 and 09).
function digestRequirements(project: ProjectData, gateNumber: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [section, rows] of Object.entries(project.requirements)) {
    const mine = rows.filter((r) => r.gate === gateNumber);
    if (mine.length === 0) continue;
    out[section] = mine
      .map((r) => `${r.requirement}=${r.status}/${r.priority ?? ''}/${r.naRationale ?? ''}/${r.evidenceLink ?? ''}`)
      .join('|');
  }
  return out;
}

export function gateEvidenceSnapshot(
  project: ProjectData,
  gateId: string,
  market?: string,
): GateEvidenceSnapshot {
  const record = project.gates.find((g) => g.gateId === gateId);
  const gateNumber = gateId.replace('SG', '');
  const registers: Record<string, string> = {};
  for (const key of registersReadAtGate(gateId)) {
    registers[key] = digestRegister(
      REGISTER_CONFIGS.find((c) => c.key === key),
      project.registers[key] ?? [],
    );
  }
  const artworkRows = project.registers[ARTWORK_REGISTER] ?? [];
  return {
    gateId,
    ...(market ? { market } : {}),
    status: record?.status ?? 'Not Started',
    checklists: digestChecklists(project, gateNumber),
    requirements: digestRequirements(project, gateNumber),
    gateChecks: project.gateChecks
      .filter((c) => c.gate === gateNumber)
      .map((c) => ({ check: c.check, done: c.done, ynna: c.ynna, ...(c.notes ? { notes: c.notes } : {}) })),
    evidenceLinks: [record?.evidenceLink ?? ''].filter((l) => l !== ''),
    registers,
    openActions: project.nextActions
      .filter((a) => a.gateId === gateId && !NEXT_ACTION_TERMINAL_STATUSES.includes(a.status))
      .map((a) => ({ id: a.id, title: a.description, status: a.status, priority: a.priority })),
    formulaVersion: project.formulaVersion,
    // "Artwork version where relevant" — only for the per-market gates that carry
    // artwork at all; recording it everywhere would make a Gate 2 signature go
    // stale because somebody edited a label.
    ...(market && artworkRows.length > 0
      ? { artworkVersion: digestRegister(REGISTER_CONFIGS.find((c) => c.key === ARTWORK_REGISTER), artworkRows) }
      : {}),
  };
}

// What changed between the snapshot a signature attests to and the project as it
// stands — question 29(1)'s "the system identifies what changed", in words a
// person can act on rather than a diff of JSON.
export function snapshotChanges(before: GateEvidenceSnapshot, after: GateEvidenceSnapshot): string[] {
  const changes: string[] = [];
  if (before.status !== after.status) changes.push(`Gate status: "${before.status}" -> "${after.status}"`);
  if (before.formulaVersion !== after.formulaVersion) {
    changes.push(`Formula version: ${before.formulaVersion} -> ${after.formulaVersion}`);
  }
  if ((before.artworkVersion ?? '') !== (after.artworkVersion ?? '')) {
    changes.push('Packaging / artwork records changed');
  }

  for (const [key, digest] of Object.entries(after.checklists)) {
    if ((before.checklists[key] ?? '') !== digest) changes.push(`Checklist changed: ${key}`);
  }
  for (const [key, digest] of Object.entries(after.requirements)) {
    if ((before.requirements[key] ?? '') !== digest) changes.push(`Requirements changed: ${key}`);
  }

  const beforeChecks = new Map(before.gateChecks.map((c) => [c.check, c]));
  for (const check of after.gateChecks) {
    const was = beforeChecks.get(check.check);
    if (!was) changes.push(`New Key Gate Check: "${check.check}"`);
    else if (was.done !== check.done || was.ynna !== check.ynna || (was.notes ?? '') !== (check.notes ?? '')) {
      changes.push(`Key Gate Check changed: "${check.check}"`);
    }
  }

  for (const [key, digest] of Object.entries(after.registers)) {
    if ((before.registers[key] ?? '') !== digest) changes.push(`Register changed: ${key}`);
  }
  for (const key of Object.keys(before.registers)) {
    if (!(key in after.registers)) changes.push(`Register no longer read at this gate: ${key}`);
  }

  const beforeActions = new Map(before.openActions.map((a) => [a.id, a]));
  for (const action of after.openActions) {
    const was = beforeActions.get(action.id);
    if (!was) changes.push(`New open action: ${action.title || action.id}`);
    else if (was.status !== action.status || was.priority !== action.priority) {
      changes.push(`Open action changed: ${action.title || action.id}`);
    }
  }
  for (const action of before.openActions) {
    if (!after.openActions.some((a) => a.id === action.id)) changes.push(`Action closed: ${action.title || action.id}`);
  }

  const evidenceBefore = before.evidenceLinks.join('|');
  const evidenceAfter = after.evidenceLinks.join('|');
  if (evidenceBefore !== evidenceAfter) changes.push('Gate evidence link changed');

  return changes;
}
