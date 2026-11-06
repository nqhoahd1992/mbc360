import type { ProjectData, ProjectReferenceData } from '../types';
import { CLAIM_LIBRARY_ENTRY_COLUMN } from '../config/referenceData';
import { projectRmCodes } from './gateProgress';

// SW-52 / Round 5 question 1(d). A passed gate keeps the company lists as they stood when it passed (`ProjectData.gateReference`);
// this says what has changed in them since, for the parts that touch THIS project. A notice, never a block: whether a change
// reopens anything is for the people with authority (SW-37), and a notice alone does not resolve a new material risk (the SME's own
// words) — the impact assessment that follows it is a separate step.

// Key order is not stable across Postgres JSONB, so two copies of the same data are compared by this form.
export function canonicalJson(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([, x]) => x !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, x]) => [k, walk(x)]),
      );
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

export function sameReference(a: ProjectReferenceData, b: ProjectReferenceData): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

export type ReferenceDataset = 'Raw Material Risk Overlay' | 'Market profile' | 'Claims Library';

export interface ReferenceChange {
  dataset: ReferenceDataset;
  // The material code, market or claim wording the change is about.
  subject: string;
  kind: 'added' | 'changed' | 'removed';
}

export interface ReferenceNotice {
  gateId: string;
  changes: ReferenceChange[];
}

function diffBy<T>(
  dataset: ReferenceDataset,
  then: readonly T[],
  now: readonly T[],
  keyOf: (x: T) => string,
  subjectOf: (x: T) => string,
  relevant: (key: string) => boolean,
): ReferenceChange[] {
  const before = new Map(then.map((x) => [keyOf(x), x]));
  const after = new Map(now.map((x) => [keyOf(x), x]));
  const out: ReferenceChange[] = [];
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    if (!relevant(key)) continue;
    const a = before.get(key);
    const b = after.get(key);
    if (a && !b) out.push({ dataset, subject: subjectOf(a), kind: 'removed' });
    else if (!a && b) out.push({ dataset, subject: subjectOf(b), kind: 'added' });
    else if (a && b && canonicalJson(a) !== canonicalJson(b)) out.push({ dataset, subject: subjectOf(b), kind: 'changed' });
  }
  return out;
}

// Whether a project has passed at least one gate: before that its checks still read the live lists, so a change needs no assessment.
export function projectHasPassedGate(project: ProjectData): boolean {
  return project.gates.some((g) => g.status === 'Complete' && (g.decision === 'Proceed' || g.decision === 'Proceed with Conditions'));
}

// Whether the entry a list change is about is something this project uses: a material in its formula or evidence register, one of its
// markets, or a Claims Library entry one of its claims is linked to.
export function entryTouchesProject(project: ProjectData, dataset: ReferenceDataset, key: string): boolean {
  if (dataset === 'Raw Material Risk Overlay') return projectRmCodes(project).includes(key);
  if (dataset === 'Market profile') return project.identity.markets.includes(key);
  return (project.registers['claimEvidenceTraceability'] ?? []).some((row) => String(row[CLAIM_LIBRARY_ENTRY_COLUMN] ?? '').trim() === key);
}

export function referenceNotices(project: ProjectData): ReferenceNotice[] {
  const markets = new Set(project.identity.markets);
  const rmCodes = new Set(projectRmCodes(project));
  const libraryIds = new Set(
    (project.registers['claimEvidenceTraceability'] ?? [])
      .map((row) => String(row[CLAIM_LIBRARY_ENTRY_COLUMN] ?? '').trim())
      .filter((id) => id !== ''),
  );
  const notices: ReferenceNotice[] = [];
  for (const [gateId, then] of Object.entries(project.gateReference ?? {})) {
    const now = project.reference;
    const changes = [
      ...diffBy('Market profile', then.marketProfiles, now.marketProfiles, (p) => p.market, (p) => p.market, (k) => markets.has(k)),
      ...diffBy('Raw Material Risk Overlay', then.rmRisk, now.rmRisk, (r) => r.rmCode, (r) => r.displayName || r.rmCode, (k) => rmCodes.has(k)),
      ...diffBy('Claims Library', then.claimsLibrary, now.claimsLibrary, (c) => c.id, (c) => c.wording, (k) => libraryIds.has(k)),
    ];
    if (changes.length > 0) notices.push({ gateId, changes });
  }
  return notices.sort((a, b) => a.gateId.localeCompare(b.gateId));
}
