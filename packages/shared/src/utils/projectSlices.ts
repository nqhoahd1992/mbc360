// The parts of a project, other than registers, that a gate's readiness reads — and which gate
// owns each (software rule SW-5, docs/rules/Software_Rules.md).
//
// A gate's signature records the data its readiness depends on. Registers are handled column by
// column (registerColumnGates.ts); these are the rest: the Formula BOM, costing, formula
// properties, the five explicit assessments, the study approval trail, the project identity
// fields and the per-market and change records. WHICH of them a gate reads is measured, not
// written (column-reads-lib.ts, PROJECT_SLICE_READS_BY_GATE), so it cannot drift from the checks.
//
// Ownership follows the lock each one already has in the API:
//   identity (scope, target users) ................. Gate 01
//   identity.markets ................................ none (adding a market stays open, F4)
//   bom, costing, formulaProperties ................ Gate 05
//   assessments ..................................... the gate whose tab answers each one
//   studyApprovals .................................. Gate 08 (Study Protocol register's gate)
// Market tracks, change records, post-launch reviews and the formula version history have NO gate
// lock (that is a separate decision), so they have no owner: they are recorded and reported when
// they change after signing, but never make a signature stale.
//
// Same split as for register columns: data owned by this gate or an earlier one is what the
// signature is accountable for; data owned by a later gate, or by none, is recorded for the
// signer's approval of "what was filled in" but a later change is information only.
import { ASSESSMENT_FIELDS, ASSESSMENT_HOMES } from '../config/assessments';
import { PROJECT_SLICE_READS_BY_GATE } from '../config/registerColumnReads';
import type { ProjectData } from '../types';
import { gateOrder } from './gateRefs';

// Stable text for any JSON-like value: object keys sorted so a re-saved record cannot look changed.
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

// The identity fields readiness reads. NOT the whole identity: the reviewers, the lead and the
// archived flag are people and lifecycle, not evidence a gate depends on.
const IDENTITY_FIELDS = ['initialScope', 'initialTargetUsers'] as const;

interface SliceDef {
  // Gate that owns it, or null = no gate lock exists, so no owner.
  owner: string | null;
  digest: (project: ProjectData) => string;
}

const SLICES: Record<string, SliceDef> = {
  identity: {
    owner: 'SG01',
    digest: (p) => stable(Object.fromEntries(IDENTITY_FIELDS.map((f) => [f, (p.identity as unknown as Record<string, unknown>)[f]]))),
  },
  // The markets are NOT Gate 1's to sign even though Gate 1 reads them: adding a market stays open
  // after Gate 1 by design (F4), and the per-market lanes of Gates 10-12 grow with it. Owned by
  // no gate, so a market added later is reported as information and never un-passes a gate.
  'identity.markets': {
    owner: null,
    digest: (p) => stable([...(p.identity.markets ?? [])].sort()),
  },
  bom: { owner: 'SG05', digest: (p) => stable(p.bom) },
  costing: { owner: 'SG05', digest: (p) => stable(p.costing) },
  formulaProperties: { owner: 'SG05', digest: (p) => stable(p.formulaProperties) },
  studyApprovals: { owner: 'SG08', digest: (p) => stable(p.studyApprovals) },
  marketTracks: { owner: null, digest: (p) => stable(p.marketTracks) },
  changes: { owner: null, digest: (p) => stable(p.changes) },
  postLaunchReviews: { owner: null, digest: (p) => stable(p.postLaunchReviews) },
  formulaVersionHistory: { owner: null, digest: (p) => stable(p.formulaVersionHistory) },
};

// The five assessments each have their own owner (the gate whose tab answers them), so the
// 'assessments' slice splits into one entry per assessment.
for (const home of ASSESSMENT_HOMES) {
  SLICES[`assessments:${home.key}`] = {
    owner: home.gateId,
    digest: (p) =>
      stable(
        Object.fromEntries(
          ASSESSMENT_FIELDS[home.key].map((f) => [f, (p.assessments as unknown as Record<string, unknown>)[f]]),
        ),
      ),
  };
}

// Every slice entry a gate's readiness reads ('assessments' expanded to its five parts).
function slicesReadByGate(gateId: string): string[] {
  const out: string[] = [];
  for (const slice of PROJECT_SLICE_READS_BY_GATE[gateId] ?? []) {
    if (slice === 'assessments') out.push(...ASSESSMENT_HOMES.map((h) => `assessments:${h.key}`));
    else if (slice === 'identity') out.push('identity', 'identity.markets');
    else if (slice in SLICES) out.push(slice);
  }
  return out;
}

// The digests a gate's signature records, split by accountability.
export function projectSliceDigests(
  project: ProjectData,
  gateId: string,
): { settled: Record<string, string>; later: Record<string, string> } {
  const settled: Record<string, string> = {};
  const later: Record<string, string> = {};
  const here = gateOrder(gateId);
  for (const name of slicesReadByGate(gateId)) {
    const def = SLICES[name];
    const accountable = def.owner !== null && gateOrder(def.owner) <= here;
    (accountable ? settled : later)[name] = def.digest(project);
  }
  return { settled, later };
}

// Slice entries that exist, for the sweep that checks the trace names nothing unknown.
export const KNOWN_PROJECT_SLICES: readonly string[] = Object.keys(SLICES).filter((k) => !k.startsWith('assessments:')).concat('assessments');
