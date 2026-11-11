// The formula-version lifecycle and the per-market supersession decision
// (Round 4 question 2, built 2026-08-29; reshaped by Round 5 question 5, 2026-11-11).
//
// Round 4's central point is a negative one: "an older formula version does not
// automatically close when the replacement receives launch approval". Round 5 question 5
// then said HOW it closes, market by market:
//   (a) each of the ten facts is confirmed by the function accountable for it, Quality
//       coordinates the market's supersession, and the authorised final approver confirms
//       the completed transition — signers are named per project;
//   (b) the normal start of transition is the approved market release of the replacement at
//       Gate 11 (Gate 10 dossier approval alone is insufficient), unless another approved
//       implementation date is set in the transition plan; Active / Transition / Superseded
//       are kept PER MARKET and the version's own state is derived from them;
//   (c) a Minor change does not start a transition by itself, a documentation-only correction
//       is a document revision with no stock transition;
//   (d) a version that was never released may be superseded once a person has confirmed there
//       was no release.
import type {
  FormulaVersionRecord,
  FormulaVersionState,
  ProjectData,
  SupersessionDecision,
} from '../types';
import { REVIEW_ROLES } from '../config/reviewers';
import { isMarketLaunched, isMarketWithdrawn } from './postLaunch';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// The ten facts question 2 requires, each with the function(s) accountable for it (Round 5 question 5(a): "R&I; for formula identity,
// Quality/Manufacturing for batch and last-release facts, Regulatory for PIF/notification/labelling obligations, Supply Chain for stock
// disposition, and Sales/Marketing for market communications"). Where two functions are named, either one's holder may confirm.
// Which fact belongs to which function is OUR reading of that sentence [ASSUMPTION: R6-Q11]. Function keys are the review-area keys of
// config/reviewers.ts; the people are the ones the project's Lead assigned to them.
export type SupersessionFactKey =
  | 'replacementVersion'
  | 'effectiveTransitionDate'
  | 'lastReleaseDate'
  | 'stockDisposition'
  | 'regulatoryNotificationStatus'
  | 'artworkTransition'
  | 'pifUpdate'
  | 'salesMarketingCommunication'
  | 'distributorCommunication'
  | 'noFurtherBatchesConfirmed';

export interface SupersessionFact {
  key: SupersessionFactKey;
  label: string;
  kind: 'text' | 'date' | 'flag';
  functions: readonly string[];
}

export const SUPERSESSION_FACTS: readonly SupersessionFact[] = [
  { key: 'replacementVersion', label: 'Replacement formula version', kind: 'text', functions: ['ri'] },
  { key: 'effectiveTransitionDate', label: 'Effective transition date', kind: 'date', functions: ['quality'] },
  { key: 'lastReleaseDate', label: 'Last manufacturing or release date for the old version', kind: 'date', functions: ['quality', 'manufacturing'] },
  { key: 'stockDisposition', label: 'Stock disposition or sell-through arrangement', kind: 'text', functions: ['supply-chain'] },
  { key: 'regulatoryNotificationStatus', label: 'Regulatory notification or registration status', kind: 'text', functions: ['regulatory'] },
  { key: 'artworkTransition', label: 'Applicable artwork and ingredient-list transition', kind: 'text', functions: ['regulatory'] },
  { key: 'pifUpdate', label: 'PIF / Product Master File update', kind: 'text', functions: ['regulatory'] },
  { key: 'salesMarketingCommunication', label: 'Sales and Marketing communication', kind: 'text', functions: ['sales-marketing'] },
  { key: 'distributorCommunication', label: 'Required distributor or customer communication', kind: 'text', functions: ['sales-marketing'] },
  {
    key: 'noFurtherBatchesConfirmed',
    label: 'Confirmation that no further batches will be released under the old version',
    kind: 'flag',
    functions: ['quality', 'manufacturing'],
  },
];

// "Quality coordinates final per-market supersession" — the function that marks a market's ten facts as standing.
export const SUPERSESSION_COORDINATOR = 'quality';
// "the authorised final approver confirms the completed transition" — the Final Approver capability (the one that already approves a
// formulation change commercially). Our reading of who that is [ASSUMPTION: R6-Q11].
export const SUPERSESSION_FINAL_CAPABILITY = 'formulation-change|approve-commercial';

export const functionLabel = (key: string): string => REVIEW_ROLES.find((r) => r.key === key)?.label ?? key;
export const functionsLabel = (keys: readonly string[]): string => keys.map(functionLabel).join(' or ');

// A fact has a value when the person has filled it in; the flag fact when its box is ticked.
export function supersessionFactFilled(decision: SupersessionDecision, fact: SupersessionFact): boolean {
  return fact.kind === 'flag' ? !!decision.noFurtherBatchesConfirmed : text(decision[fact.key as keyof SupersessionDecision]) !== '';
}

export function supersessionFactConfirmation(decision: SupersessionDecision, key: string): { by: string; at: string } | undefined {
  return decision.factConfirmations?.[key];
}

// A decision confirmed before question 5 was answered carries one confirmation and no per-function ones. It stays valid: nothing was
// asked of it then that it can be asked now, and discarding a person's recorded decision would reopen versions already superseded.
export function isLegacyConfirmed(decision: SupersessionDecision): boolean {
  return text(decision.confirmedBy) !== '' && text(decision.finalApprovedBy) === '' && Object.keys(decision.factConfirmations ?? {}).length === 0;
}

// What is still missing from one decision. Empty means it is complete and the market is superseded.
export function supersessionGaps(decision: SupersessionDecision): string[] {
  if (isLegacyConfirmed(decision)) return [];
  const gaps: string[] = [];
  for (const fact of SUPERSESSION_FACTS) {
    if (!supersessionFactFilled(decision, fact)) gaps.push(fact.label);
    else if (!supersessionFactConfirmation(decision, fact.key)) gaps.push(`${fact.label} — to be confirmed by ${functionsLabel(fact.functions)}`);
  }
  if (text(decision.coordinatedBy) === '') gaps.push(`Coordination of the market's supersession by ${functionLabel(SUPERSESSION_COORDINATOR)}`);
  if (text(decision.finalApprovedBy) === '') gaps.push('Confirmation of the completed transition by the authorised final approver');
  return gaps;
}

export function isSupersessionComplete(decision: SupersessionDecision): boolean {
  return supersessionGaps(decision).length === 0;
}

// All ten facts stand (each filled and confirmed by its function): what Quality coordinates and the final approver then confirms.
export function allFactsConfirmed(decision: SupersessionDecision): boolean {
  return SUPERSESSION_FACTS.every((f) => supersessionFactFilled(decision, f) && !!supersessionFactConfirmation(decision, f.key));
}

// --- The chain of versions ---------------------------------------------------------------------------------------------------------------
// `formulaVersionHistory` holds every version but the current one; the current one's own kind (Major, Minor, documentation-only) rides on
// `currentFormulaVersionRecord`. Together they are the lineage, oldest first.
interface ChainLink {
  version: string;
  previousVersion: string;
  changeType: 'Major' | 'Minor';
  documentationOnly: boolean;
}
function versionChain(project: ProjectData): ChainLink[] {
  const links: ChainLink[] = project.formulaVersionHistory.map((v) => ({
    version: v.version,
    previousVersion: v.previousVersion,
    changeType: v.changeType,
    documentationOnly: !!v.documentationOnly,
  }));
  const current = project.currentFormulaVersionRecord;
  links.push({
    version: project.formulaVersion,
    previousVersion: current?.previousVersion ?? links.at(-1)?.version ?? '',
    changeType: current?.changeType ?? 'Major',
    documentationOnly: !!current?.documentationOnly,
  });
  return links;
}
const successorsOf = (project: ProjectData, version: string): ChainLink[] =>
  versionChain(project).filter((l) => l.previousVersion === version && l.version !== version);

// Markets where `version` has been launched and is not withdrawn. A Minor change carries the tracks over to the new version (it reopens
// no gate), so where the version itself has none left, the product is still on sale there under its Minor successor — and the old
// version's stock is what the transition is about.
export function versionMarkets(project: ProjectData, version: string): string[] {
  const own = [
    ...new Set(
      project.marketTracks
        .filter((t) => t.formulaVersion === version && isMarketLaunched(t) && !isMarketWithdrawn(t))
        .map((t) => t.market),
    ),
  ];
  if (own.length > 0) return own;
  const carried = successorsOf(project, version)
    .filter((s) => s.changeType === 'Minor' && !s.documentationOnly)
    .flatMap((s) => versionMarkets(project, s.version));
  return [...new Set(carried)];
}

// --- State, per market and for the version -----------------------------------------------------------------------------------------------
export type MarketVersionState = 'Active' | 'Transition in Progress' | 'Superseded';

const decisionOf = (project: ProjectData, version: string, market: string): SupersessionDecision | undefined =>
  project.supersessionDecisions.find((d) => d.version === version && d.market === market);

// "Use approved market implementation/release of the replacement at Gate 11 as the normal start of transition. Gate 10 dossier approval
// alone is insufficient." The launch approval of a MAJOR replacement in that market is the Gate 11 act. A Minor change starts nothing by
// itself ("no automatic immediate transition"): it needs its approved effective date. "A different approved implementation date may be set
// in the CHG transition plan" — the effective transition date a person records starts the market's transition whichever way it began; we
// read the recorded date as the approval, and do not compare it with today's date [ASSUMPTION: R6-Q11].
export function transitionStartedIn(project: ProjectData, version: string, market: string): boolean {
  const d = decisionOf(project, version, market);
  if (d && text(d.effectiveTransitionDate) !== '') return true;
  return successorsOf(project, version)
    .filter((s) => s.changeType === 'Major')
    .some((s) =>
      project.marketTracks.some((t) => t.formulaVersion === s.version && t.market === market && t.launchApproval === 'Approved'),
    );
}

export function marketVersionState(project: ProjectData, version: string, market: string): MarketVersionState {
  const d = decisionOf(project, version, market);
  if (d && isSupersessionComplete(d)) return 'Superseded';
  return transitionStartedIn(project, version, market) ? 'Transition in Progress' : 'Active';
}

// The version's own state, derived from its markets' (Round 5 question 5(b): "derive the overall version status from those market
// states"): Superseded when every market is; Active while any market is still Active; otherwise Transition in Progress. Withdrawn and
// Cancelled are recorded states and pass through. A version that was never on sale anywhere keeps the state a person recorded when they
// confirmed there was no release. A documentation-only successor means this version was never replaced in the market — its document
// was revised — so it is Superseded without a stock transition.
export function derivedVersionState(project: ProjectData, record: Pick<FormulaVersionRecord, 'version' | 'state'>): FormulaVersionState {
  const stored = record.state;
  if (stored === 'Withdrawn' || stored === 'Cancelled') return stored;
  if (record.version === project.formulaVersion) return stored ?? 'Active';
  if (successorsOf(project, record.version).some((s) => s.changeType === 'Minor' && s.documentationOnly)) return 'Superseded';
  const markets = versionMarkets(project, record.version);
  if (markets.length === 0) return stored ?? 'Superseded';
  const states = markets.map((m) => marketVersionState(project, record.version, m));
  if (states.every((s) => s === 'Superseded')) return 'Superseded';
  if (states.some((s) => s === 'Active')) return 'Active';
  return 'Transition in Progress';
}

// The state of one version. For a version of the history the stored value is already the derived one when the data came from the API.
export function formulaVersionState(project: ProjectData, version: string): FormulaVersionState {
  if (version === project.formulaVersion) {
    const own = project.formulaVersionHistory.find((v) => v.version === version);
    return own?.state ?? 'Active';
  }
  const record = project.formulaVersionHistory.find((v) => v.version === version);
  return record?.state ?? 'Superseded';
}

// Markets in which a version is still awaiting its supersession decision. A version transitions market by market: a product can be
// superseded in Vietnam while the old version is still being sold in Australia.
export function marketsAwaitingSupersession(project: ProjectData, version: string): string[] {
  return versionMarkets(project, version).filter((m) => marketVersionState(project, version, m) !== 'Superseded');
}

// Whether a version may now move to Superseded — every market decided.
export function supersessionReady(project: ProjectData, version: string): boolean {
  if (versionMarkets(project, version).length === 0) return false;
  return marketsAwaitingSupersession(project, version).length === 0;
}

// Versions currently mid-transition, for the project-level roll-up and the UI.
export function transitioningVersions(project: ProjectData): FormulaVersionRecord[] {
  return project.formulaVersionHistory.filter(
    (v) => v.state === 'Transition Approved' || v.state === 'Transition in Progress',
  );
}

// Older versions that still owe a supersession decision somewhere: on sale in a market and not yet superseded there, whether or not the
// replacement has been approved yet (the facts may be recorded ahead of the approval).
export function versionsOwingSupersession(project: ProjectData): FormulaVersionRecord[] {
  return project.formulaVersionHistory.filter(
    (v) => (v.state === 'Active' || v.state === 'Transition Approved' || v.state === 'Transition in Progress') && marketsAwaitingSupersession(project, v.version).length > 0,
  );
}
