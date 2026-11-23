// Round 5 question 12 (SME answer, 2026-11-05): adding a market after Gate 1 is choice (3).
//
//   - The market gets its own Gates 10-12 track AND a mandatory Regulatory impact assessment, "with Safety/R&I/Quality input as
//     needed". "Until assessment is complete the new market cannot release; existing markets continue unless a shared issue is
//     identified."
//   - What differs decides which reviews reopen or extend (the table below, transcribed from the answer). "No substantive
//     difference": "Record Regulatory's signed equivalence conclusion and reuse the approved evidence; no blanket backtrack."
//   - "Do not automatically invalidate unrelated markets using an unchanged approved formula." "Record the added market as an
//     approved scope amendment to the Gate 1 baseline" — the assessment record is that amendment.
//
// The answer's reviews are of two strengths: stated outright ("Gate 4 ingredient compliance"), or conditional ("Gates 5 and 7 if
// formula or safety changes"). Regulatory confirms the conditional ones in the assessment; which ones apply is a judgement the
// system cannot make. That reading, and who may assess, are [ASSUMPTION: R6-Q18].
import type { MarketAdditionAssessment, ProjectData } from '../types';
import { GATES } from '../config/gates';
import { isGateRecordedPassed } from './changeTriage';

export interface MarketDifferenceKind {
  label: string;
  // Reviews the answer states outright.
  base: string[];
  // Reviews the answer makes conditional, with the condition in the answer's own words.
  optional: Record<string, string>;
  // "relevant market Gates 10-11": reviews of the NEW market's own lane, which is open anyway because the market has no signature yet.
  marketGates: string[];
}

export const MARKET_DIFFERENCE_KINDS: MarketDifferenceKind[] = [
  {
    label: 'Ingredient restriction / permitted level',
    base: ['SG04'],
    optional: { SG05: 'if the formula changes', SG07: 'if safety changes', SG08: 'if testing is affected', SG09: 'if manufacture is affected' },
    marketGates: [],
  },
  {
    label: 'Claim / intended use / user population',
    base: ['SG03'],
    optional: { SG02: 'where users or exposure change', SG07: 'where safety must change', SG08: 'where evidence must change' },
    marketGates: [],
  },
  {
    label: 'Pack, language, warning or declaration',
    base: ['SG06'],
    optional: { SG09: 'if functional pack compatibility changes' },
    marketGates: ['SG10', 'SG11'],
  },
  {
    label: 'New safety / exposure requirement',
    base: ['SG04', 'SG07'],
    optional: { SG02: 'as needed for exposure', SG08: 'for additional verification', SG09: 'for additional verification' },
    marketGates: [],
  },
];

export const MARKET_DIFFERENCE_LABELS = MARKET_DIFFERENCE_KINDS.map((k) => k.label);
// The input the answer names. Whether it is taken per assessment is the answer's "as needed".
export const MARKET_ADDITION_INPUT_FUNCTIONS = ['Safety', 'R&I', 'Quality'] as const;
// Who assesses: the holder of the Regulatory function on the project (SW-57: neither an administrator nor another area stands in).
export const MARKET_ADDITION_FUNCTION_KEYS = ['regulatory'] as const;
// "Existing markets continue unless a shared issue is identified": when Regulatory names other markets the finding reaches, the release
// decisions of those markets (their Gate 10 and 11 lanes) are reopened, and a market already on sale gets a linked Gate 12 review.
export const AFFECTED_MARKET_LANE_GATES = ['SG10', 'SG11'] as const;

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const gateIndex = (id: string): number => GATES.findIndex((g) => g.id === id);

export const isMarketAdditionPending = (a: MarketAdditionAssessment): boolean => text(a.assessedAt) === '';

export function pendingMarketAdditions(project: Pick<ProjectData, 'marketAdditionAssessments'>): MarketAdditionAssessment[] {
  return (project.marketAdditionAssessments ?? []).filter(isMarketAdditionPending);
}

// A market with an unfinished assessment cannot release. The others are untouched ("existing markets continue").
export function marketIsHeldByAssessment(project: Pick<ProjectData, 'marketAdditionAssessments'>, market: string): boolean {
  return pendingMarketAdditions(project).some((a) => a.market === market);
}

export function kindsOf(differences: readonly string[]): MarketDifferenceKind[] {
  return MARKET_DIFFERENCE_KINDS.filter((k) => differences.includes(k.label));
}

// Every conditional review the chosen differences make possible, with its condition.
export function optionalReviewsFor(differences: readonly string[]): Array<{ gateId: string; conditions: string[] }> {
  const map = new Map<string, string[]>();
  for (const kind of kindsOf(differences)) {
    for (const [gateId, condition] of Object.entries(kind.optional)) map.set(gateId, [...(map.get(gateId) ?? []), condition]);
  }
  return [...map.entries()].map(([gateId, conditions]) => ({ gateId, conditions })).sort((a, b) => gateIndex(a.gateId) - gateIndex(b.gateId));
}

// The reviews an assessment calls for: what the differences state outright plus the conditional ones Regulatory confirmed
// (only those the chosen differences actually allow), in gate order. `marketGates` are the new market's own lane.
export function marketAdditionScope(a: Pick<MarketAdditionAssessment, 'differences' | 'extraGates' | 'noDifference'>): { gates: string[]; marketGates: string[] } {
  if (a.noDifference) return { gates: [], marketGates: [] };
  const allowed = new Set(optionalReviewsFor(a.differences).map((o) => o.gateId));
  const gates = new Set<string>();
  const marketGates = new Set<string>();
  for (const k of kindsOf(a.differences)) {
    k.base.forEach((g) => gates.add(g));
    k.marketGates.forEach((g) => marketGates.add(g));
  }
  for (const g of a.extraGates) if (allowed.has(g)) gates.add(g);
  const order = (x: string, y: string) => gateIndex(x) - gateIndex(y);
  return { gates: [...gates].sort(order), marketGates: [...marketGates].sort(order) };
}

// What a finished assessment must carry. One function for the screen and the API.
export function marketAdditionProblems(
  input: Pick<MarketAdditionAssessment, 'differences' | 'noDifference' | 'extraGates' | 'inputFrom' | 'conclusion' | 'equivalenceConclusion'> & {
    affectedMarkets?: string[];
    market?: string;
    projectMarkets?: readonly string[];
  },
): string[] {
  const problems: string[] = [];
  const affected = input.affectedMarkets ?? [];
  if (input.noDifference && affected.length > 0) problems.push('"no substantive difference" reaches no other market, so none can be named');
  if (input.market && affected.includes(input.market)) problems.push('the added market itself cannot be one of the other markets affected');
  if (input.projectMarkets) {
    const notOurs = affected.filter((m) => !input.projectMarkets!.includes(m));
    if (notOurs.length > 0) problems.push(`markets of this project only (not ${notOurs.join(', ')})`);
  }
  const unknown = input.differences.filter((d) => !MARKET_DIFFERENCE_LABELS.includes(d));
  if (unknown.length > 0) problems.push(`known kinds of difference only (not ${unknown.join(', ')})`);
  if (input.noDifference) {
    if (input.differences.length > 0) problems.push('"no substantive difference" cannot be combined with a difference');
    if (input.extraGates.length > 0) problems.push('"no substantive difference" reopens nothing, so no further reviews can be chosen');
    if (text(input.equivalenceConclusion) === '') problems.push("Regulatory's equivalence conclusion, with the approved evidence it reuses");
  } else {
    if (input.differences.length === 0) problems.push('the difference(s) found — or "no substantive difference" with the equivalence conclusion');
    if (text(input.conclusion) === '') problems.push('what differs and why these reviews were chosen');
    const allowed = new Set(optionalReviewsFor(input.differences).map((o) => o.gateId));
    const stray = input.extraGates.filter((g) => !allowed.has(g));
    if (stray.length > 0) problems.push(`conditional reviews that the chosen differences allow (not ${stray.join(', ')})`);
  }
  const badInput = input.inputFrom.filter((f) => !(MARKET_ADDITION_INPUT_FUNCTIONS as readonly string[]).includes(f));
  if (badInput.length > 0) problems.push(`input from ${MARKET_ADDITION_INPUT_FUNCTIONS.join(' / ')} only (not ${badInput.join(', ')})`);
  return problems;
}

// The gates of an assessment's scope that stand passed and so are reopened; the rest were never decided (or already reopened).
export function gatesToReopen(project: ProjectData, a: Pick<MarketAdditionAssessment, 'differences' | 'extraGates' | 'noDifference'>): string[] {
  return marketAdditionScope(a).gates.filter((gid) => isGateRecordedPassed(project.gates.find((g) => g.gateId === gid)));
}
