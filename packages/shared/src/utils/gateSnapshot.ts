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
import { PHASE_CONFIGS } from '../config/phases';
import { REGISTER_CONFIGS } from '../config/registers';
import { NEXT_ACTION_PRIORITIES, NEXT_ACTION_TERMINAL_STATUSES } from '../types';
import { gateRefGateIds } from './gateRefs';
import { columnsByAccountability, registersReadByGate } from './registerColumnGates';
import { projectSliceDigests } from './projectSlices';

// Deliberately NOT imported from gateProgress, which is a one-line filter there:
// gateProgress reads THIS module (the `gateSignedOff` check needs the snapshot to
// decide staleness), and a module cycle that happens to work because both sides
// only touch each other inside function bodies is a trap for whoever edits it
// next.

const ARTWORK_REGISTER = 'packagingSpecsArtwork';

// Every register the gate's readiness reads — generic checks AND the bespoke ones and the
// triggers, which the old walk over `'register' in check` could not see. Measured, see
// registerColumnGates.ts.
export function registersReadAtGate(gateId: string): string[] {
  return registersReadByGate(gateId);
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
      // A section can span gates ('08-09'); the later gate owns it, as for a register column
      // (registerColumnGates.ts), so it is signed at the LAST gate of its list. Comparing the
      // raw string, as this did, meant a section tagged '08-09' belonged to no gate at all and
      // was never in any signature.
      const owners = gateRefGateIds(section.gate);
      if (owners.length === 0 ? section.gate !== gateNumber : owners[owners.length - 1] !== `SG${gateNumber}`) continue;
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

// A register reduced to the columns given, row by row. Rows are named by position: once any
// column of a register is frozen rows can no longer be added, removed or reordered, so a position
// stays the same row for as long as a signature that covers it can be current.
function digestRegisterCells(rows: RegisterRow[], columns: string[]): string {
  return rows
    .map((row, index) => [`#${index}`, ...columns.map((key) => `${key}=${String(row[key] ?? '')}`)].join('|'))
    .join('\n');
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
  const registerCells: Record<string, string> = {};
  const registerLater: Record<string, string> = {};
  for (const key of registersReadAtGate(gateId)) {
    const { settled, later } = columnsByAccountability(gateId, key);
    registerCells[key] = digestRegisterCells(project.registers[key] ?? [], settled);
    registerLater[key] = digestRegisterCells(project.registers[key] ?? [], later);
  }
  const artworkRows = project.registers[ARTWORK_REGISTER] ?? [];
  const slices = projectSliceDigests(project, gateId);
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
    registerCells,
    registerLater,
    projectData: slices.settled,
    projectDataLater: slices.later,
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
// Every Next Action of one gate as it stands now, open or not. The signature snapshot only
// records the OPEN ones (the conditions accepted), so telling "closed since" apart from
// "deleted since" needs the current state of all of them.
export interface GateActionState {
  id: string;
  title: string;
  status: string;
  priority: string;
}

export function gateActionStates(project: ProjectData, gateId: string): GateActionState[] {
  return project.nextActions
    .filter((a) => a.gateId === gateId)
    .map((a) => ({ id: a.id, title: a.description, status: a.status, priority: a.priority }));
}

// What changed since signing in columns a LATER gate owns. Information only — it never makes a
// signature stale, because that gate is still to finish those columns (SW-5). Empty for a
// signature taken before this was recorded.
const PROJECT_DATA_LABELS: Record<string, string> = {
  identity: 'Project identity (scope, target users)',
  'identity.markets': 'Project markets',
  bom: 'Formula BOM',
  costing: 'Costing',
  formulaProperties: 'Formula properties',
  studyApprovals: 'Study approval trail',
  marketTracks: 'Market tracking',
  changes: 'Change records',
  postLaunchReviews: 'Post-launch reviews',
  formulaVersionHistory: 'Formula version history',
  'assessments:familyUse': 'Assessment: family use',
  'assessments:administrativeOnly': 'Assessment: administrative-only change',
  'assessments:humanStudy': 'Assessment: human study',
  'assessments:scaleUp': 'Assessment: scale-up risk',
  'assessments:changeControl': 'Assessment: change control',
};

export function snapshotLaterChanges(before: GateEvidenceSnapshot, after: GateEvidenceSnapshot): string[] {
  const out: string[] = [];
  if (before.projectDataLater && after.projectDataLater) {
    for (const [name, digest] of Object.entries(after.projectDataLater)) {
      if (name in before.projectDataLater && before.projectDataLater[name] !== digest) {
        out.push(`${PROJECT_DATA_LABELS[name] ?? name} changed since signing (owned by a later gate or not gate-locked)`);
      }
    }
  }
  if (!before.registerLater || !after.registerLater) return out;
  for (const [key, digest] of Object.entries(after.registerLater)) {
    if (key in before.registerLater && before.registerLater[key] !== digest) {
      out.push(`Register ${key}: columns owned by a later gate changed since signing`);
    }
  }
  return out;
}

export function snapshotChanges(
  before: GateEvidenceSnapshot,
  after: GateEvidenceSnapshot,
  currentActions: GateActionState[],
): string[] {
  const changes: string[] = [];
  if (before.status !== after.status) changes.push(`Gate status: "${before.status}" -> "${after.status}"`);
  if (before.formulaVersion !== after.formulaVersion) {
    changes.push(`Formula version: ${before.formulaVersion} -> ${after.formulaVersion}`);
  }
  if ((before.artworkVersion ?? '') !== (after.artworkVersion ?? '')) {
    changes.push('Packaging / artwork records changed');
  }

  for (const [key, digest] of Object.entries(after.checklists)) {
    // A section the signature never recorded predates it being in scope: not a change.
    if (key in before.checklists && before.checklists[key] !== digest) changes.push(`Checklist changed: ${key}`);
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

  // A signature taken with `registerCells` is compared on what that gate is accountable for
  // (the columns it and earlier gates own, over its own rows). One taken before that existed is compared on the whole-register
  // digest, as it always was — treating it as current would silently weaken it, and treating
  // it as stale would invalidate signatures on evidence nobody has touched.
  if (before.registerCells && after.registerCells) {
    for (const [key, digest] of Object.entries(after.registerCells)) {
      if ((before.registerCells[key] ?? '') !== digest) changes.push(`Register changed: ${key}`);
    }
    for (const key of Object.keys(before.registerCells)) {
      if (!(key in after.registerCells)) changes.push(`Register no longer read at this gate: ${key}`);
    }
  } else {
    for (const [key, digest] of Object.entries(after.registers)) {
      if ((before.registers[key] ?? '') !== digest) changes.push(`Register changed: ${key}`);
    }
    for (const key of Object.keys(before.registers)) {
      if (!(key in after.registers)) changes.push(`Register no longer read at this gate: ${key}`);
    }
  }

  // The BOM, costing, assessments and the rest of what readiness reads that is not a register.
  // Compared only when the signature recorded it (older ones did not).
  if (before.projectData && after.projectData) {
    for (const [name, digest] of Object.entries(after.projectData)) {
      if (name in before.projectData && before.projectData[name] !== digest) changes.push(`${PROJECT_DATA_LABELS[name] ?? name} changed`);
    }
  }

  // The open actions of a gate are the CONDITIONS its Approved signature accepted, so what
  // makes a signature stale is changing a condition or adding one — not carrying one out.
  // Closing or cancelling an action, moving its status or reassigning it is fulfilment,
  // and treating it as a change left a gate that passed with conditions unable to close
  // them without Backtrack. Raising a priority is not a change to what was accepted
  // either; whether a Critical action still blocks the gate is the readiness engine's
  // call. [ASSUMPTION: R5-Q59]
  const acceptedIds = new Set(before.openActions.map((a) => a.id));
  const now = new Map(currentActions.map((a) => [a.id, a]));
  const rank = (priority: string) => NEXT_ACTION_PRIORITIES.indexOf(priority as (typeof NEXT_ACTION_PRIORITIES)[number]);
  for (const accepted of before.openActions) {
    const current = now.get(accepted.id);
    const name = accepted.title || accepted.id;
    if (!current) changes.push(`Condition removed: ${name}`);
    else {
      if (current.title !== accepted.title) changes.push(`Condition reworded: ${name}`);
      if (rank(current.priority) < rank(accepted.priority)) changes.push(`Condition priority lowered: ${name}`);
    }
  }
  for (const action of currentActions) {
    if (NEXT_ACTION_TERMINAL_STATUSES.includes(action.status as never) || acceptedIds.has(action.id)) continue;
    changes.push(`New open action: ${action.title || action.id}`);
  }

  const evidenceBefore = before.evidenceLinks.join('|');
  const evidenceAfter = after.evidenceLinks.join('|');
  if (evidenceBefore !== evidenceAfter) changes.push('Gate evidence link changed');

  return changes;
}

// ---------------------------------------------------------------------------------------------
// The signing preview (2026-10-09, project owner's request).
//
// Before signing, the signer sees the whole snapshot on one screen and the signature is bound to a
// content hash of it. What the hash covers is exactly what the signer is ACCOUNTABLE for: the
// whole-register digest (`registers`) and the parts owned by a LATER gate (`registerLater`,
// `projectDataLater`) are left out. The first duplicates `registerCells` plus `registerLater`; the
// other two are information only (SW-5), and including them would let a later gate's ordinary work
// stop an earlier gate being signed. Other people may therefore keep contributing while a signer is
// reading; only a change to what is being signed stops the submit.
//
// The hash itself is computed by the API (it needs a hash function, and this module is also
// bundled into the browser). Everything that decides WHAT is hashed lives here so both sides agree.
export function gateSnapshotSignedPart(snapshot: GateEvidenceSnapshot): Omit<
  GateEvidenceSnapshot,
  'registers' | 'registerLater' | 'projectDataLater'
> {
  const { registers: _registers, registerLater: _registerLater, projectDataLater: _later, ...signed } = snapshot;
  void _registers;
  void _registerLater;
  void _later;
  return signed;
}

// JSON with object keys sorted at every level, so two equal snapshots always serialise equally
// whatever order their keys were built in.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// "#3|rmCode=RM-1|inciName=Aqua" per line -> rows of column -> value. Values that themselves hold
// a '|' or a newline split wrongly; this is only used to word a difference, never to decide one.
function parseCellDigest(digest: string): Record<string, string>[] {
  if (digest === '') return [];
  return digest.split('\n').map((line) => {
    const row: Record<string, string> = {};
    for (const part of line.split('|')) {
      const at = part.indexOf('=');
      if (at > 0) row[part.slice(0, at)] = part.slice(at + 1);
    }
    return row;
  });
}

function describeRegisterDifference(key: string, before: string, after: string): string[] {
  const was = parseCellDigest(before);
  const now = parseCellDigest(after);
  const out: string[] = [];
  const rows = Math.max(was.length, now.length);
  for (let i = 0; i < rows; i += 1) {
    if (!was[i]) out.push(`Register ${key}: row ${i + 1} added`);
    else if (!now[i]) out.push(`Register ${key}: row ${i + 1} removed`);
    else {
      for (const column of new Set([...Object.keys(was[i]), ...Object.keys(now[i])])) {
        if ((was[i][column] ?? '') !== (now[i][column] ?? '')) {
          out.push(`Register ${key}: row ${i + 1} "${column}" changed`);
        }
      }
    }
  }
  return out.length > 0 ? out : [`Register changed: ${key}`];
}

// Why a signer's hash no longer matches: what the signer saw against what is there now, in words.
// Stricter than `snapshotChanges` (which deliberately ignores carrying out a condition), because a
// signer who read "Action X — In progress" is entitled to be told it now says "Closed".
export function describeGateContentChanges(seen: GateEvidenceSnapshot, now: GateEvidenceSnapshot): string[] {
  const out = new Set<string>();
  const states: GateActionState[] = now.openActions.map((a) => ({ ...a }));
  for (const change of snapshotChanges(seen, now, states)) {
    // Replaced by the row-level wording below where the register is read cell by cell.
    if (!/^Register changed: /.test(change)) out.add(change);
  }
  if (seen.registerCells && now.registerCells) {
    for (const [key, digest] of Object.entries(now.registerCells)) {
      const before = seen.registerCells[key] ?? '';
      if (before !== digest) for (const line of describeRegisterDifference(key, before, digest)) out.add(line);
    }
  }
  const seenActions = new Map(seen.openActions.map((a) => [a.id, a]));
  const nowActions = new Map(now.openActions.map((a) => [a.id, a]));
  for (const [id, a] of nowActions) {
    const was = seenActions.get(id);
    if (!was) continue;
    if (was.status !== a.status) out.add(`Action "${a.title || id}": status ${was.status} -> ${a.status}`);
    if (was.priority !== a.priority) out.add(`Action "${a.title || id}": priority ${was.priority} -> ${a.priority}`);
  }
  for (const [id, a] of seenActions) {
    if (!nowActions.has(id)) out.add(`Action "${a.title || id}" is no longer open`);
  }
  return [...out];
}
