// The formula-version lifecycle and the per-market supersession decision
// (Round 4 question 2, built 2026-08-29).
//
// The answer's central point is a negative one: "an older formula version does
// not automatically close when the replacement receives launch approval". Before
// this, `createFormulaVersion` moved the old version into history and nothing
// else was ever recorded about it — history WAS the closure. Now approving a
// replacement only puts the old version into "Transition in Progress", and a
// person has to record ten facts per market to finish the job.
import type {
  FormulaVersionRecord,
  FormulaVersionState,
  ProjectData,
  SupersessionDecision,
} from '../types';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// The state of one version. `state` is absent on records created before the
// lifecycle existed; the fallback is what the app MEANT at the time rather than a
// guess at what a person would have chosen — a historic record was closed, the
// current one is live.
export function formulaVersionState(project: ProjectData, version: string): FormulaVersionState {
  if (version === project.formulaVersion) {
    const own = project.formulaVersionHistory.find((v) => v.version === version);
    return own?.state ?? 'Active';
  }
  const record = project.formulaVersionHistory.find((v) => v.version === version);
  return record?.state ?? 'Superseded';
}

// The ten facts question 2 requires, each named so an incomplete decision can say
// which one is missing rather than "incomplete". `noFurtherBatchesConfirmed` is
// the tenth and is a boolean, so it is checked separately below.
const REQUIRED_FIELDS: { key: keyof SupersessionDecision; label: string }[] = [
  { key: 'replacementVersion', label: 'Replacement formula version' },
  { key: 'effectiveTransitionDate', label: 'Effective transition date' },
  { key: 'lastReleaseDate', label: 'Last manufacturing or release date for the old version' },
  { key: 'stockDisposition', label: 'Stock disposition or sell-through arrangement' },
  { key: 'regulatoryNotificationStatus', label: 'Regulatory notification or registration status' },
  { key: 'artworkTransition', label: 'Applicable artwork and ingredient-list transition' },
  { key: 'pifUpdate', label: 'PIF / Product Master File update' },
  { key: 'salesMarketingCommunication', label: 'Sales and Marketing communication' },
  { key: 'distributorCommunication', label: 'Required distributor or customer communication' },
];

// What is still missing from one decision. Empty means it is complete and may
// supersede the version in that market.
export function supersessionGaps(decision: SupersessionDecision): string[] {
  const gaps = REQUIRED_FIELDS.filter((f) => text(decision[f.key]) === '').map((f) => f.label);
  if (!decision.noFurtherBatchesConfirmed) {
    gaps.push('Confirmation that no further batches will be released under the old version');
  }
  // "Must be recorded by a person" — an unconfirmed decision is a draft, whatever
  // else it contains.
  if (text(decision.confirmedBy) === '') gaps.push('Confirmed by (an authorised person)');
  return gaps;
}

export function isSupersessionComplete(decision: SupersessionDecision): boolean {
  return supersessionGaps(decision).length === 0;
}

// Markets in which a version is still awaiting its supersession decision. A
// version transitions market by market, which is the whole reason question 2 makes
// the decision per market: a product can be superseded in Vietnam while the old
// version is still being sold in Australia.
export function marketsAwaitingSupersession(project: ProjectData, version: string): string[] {
  const done = new Set(
    project.supersessionDecisions
      .filter((d) => d.version === version && isSupersessionComplete(d))
      .map((d) => d.market),
  );
  return project.identity.markets.filter((m) => !done.has(m));
}

// Whether a version may now move to Superseded — every market decided. Returns the
// state a version SHOULD be in, so the caller writes it rather than this module
// inferring it silently: the answer forbids the system deciding supersession, and
// this only reports that the person-recorded decisions are all present.
export function supersessionReady(project: ProjectData, version: string): boolean {
  if (project.identity.markets.length === 0) return false;
  return marketsAwaitingSupersession(project, version).length === 0;
}

// Versions currently mid-transition, for the project-level roll-up and the UI.
export function transitioningVersions(project: ProjectData): FormulaVersionRecord[] {
  return project.formulaVersionHistory.filter(
    (v) => v.state === 'Transition Approved' || v.state === 'Transition in Progress',
  );
}
