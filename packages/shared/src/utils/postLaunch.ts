// Per-market launch, the post-launch review schedule, and the project-level
// roll-up (Round 4 questions 13, 14 and 2, built 2026-08-29).
//
// The whole area rests on one fact the app did not have: the ACTUAL commercial
// launch date per market. `MarketTrack.launchApprovedDate` is permission to sell;
// question 13 says the schedule runs from "the actual commercial launch date for
// the relevant market", and question 14 says "a product has launched in a market
// when the actual commercial launch date for that market is recorded". Those are
// two different days, and the app had only the first.
import type {
  MarketProfile,
  MarketTrack,
  PostLaunchReview,
  ProjectData,
  ProjectLaunchStatus,
} from '../types';
import { POST_LAUNCH_REVIEW_SCHEDULE } from '../config/referenceData';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function isMarketLaunched(track: MarketTrack): boolean {
  return text(track.actualLaunchDate) !== '';
}

export function isMarketWithdrawn(track: MarketTrack): boolean {
  return text(track.withdrawnDate) !== '';
}

// F4 (SME rule audit D, 2026-10-05): a market has one track PER FORMULA VERSION —
// "launched per-market Gate 10-12 tracks are preserved for the old formula
// version; a major change creates a new per-market Gate 10-12 track for the new
// version". The CURRENT version's tracks are the ones Gates 10-12 work on.
export function currentMarketTracks(project: ProjectData): MarketTrack[] {
  return project.marketTracks.filter((t) => t.formulaVersion === project.formulaVersion);
}

// The current version's tracks still being pursued — a withdrawn market must not
// keep a project off "Launched in all active markets" forever, nor hold a lane.
export function activeMarketTracks(project: ProjectData): MarketTrack[] {
  return currentMarketTracks(project).filter((t) => !isMarketWithdrawn(t));
}

// Question 2: a version leaves a market only through a confirmed supersession
// decision for that market.
export function isVersionSupersededIn(project: ProjectData, version: string, market: string): boolean {
  return project.supersessionDecisions.some(
    (d) => d.version === version && d.market === market && text(d.confirmedBy) !== '',
  );
}

// Every track whose product is actually on sale: launched, not withdrawn, and —
// for an older version — not yet superseded in that market. This is what
// post-market obligations follow, whichever version is on the shelf (F4's
// "old version stays on market until formally superseded/withdrawn/depleted").
export function onMarketTracks(project: ProjectData): MarketTrack[] {
  return project.marketTracks.filter(
    (t) =>
      isMarketLaunched(t) &&
      !isMarketWithdrawn(t) &&
      (t.formulaVersion === project.formulaVersion || !isVersionSupersededIn(project, t.formulaVersion, t.market)),
  );
}

// Older-version tracks still on sale — shown apart from the current version's.
export function legacyOnMarketTracks(project: ProjectData): MarketTrack[] {
  return onMarketTracks(project).filter((t) => t.formulaVersion !== project.formulaVersion);
}

// One entry per market for the post-launch review schedule, dated from the
// EARLIEST launch in that market: the product has been on sale there since then,
// whichever version it is now. The market's schedule is kept (Round 5 question 5(e):
// "keep the market surveillance schedule ... do not restart or erase the older
// version's obligations"), so an older version leaving the market does not move
// the anchor to the replacement's launch.
function reviewTracksByMarket(project: ProjectData): MarketTrack[] {
  const byMarket = new Map<string, MarketTrack>();
  for (const t of project.marketTracks.filter((x) => isMarketLaunched(x) && !isMarketWithdrawn(x))) {
    const seen = byMarket.get(t.market);
    if (!seen || text(t.actualLaunchDate) < text(seen.actualLaunchDate)) byMarket.set(t.market, t);
  }
  return [...byMarket.values()];
}

// The project's markets minus the ones withdrawn — what a per-market obligation
// (a Gate 10-12 sign-off lane, a supersession decision) is owed for. A market
// with no track yet counts as active: nothing has withdrawn it.
//
// [ASSUMPTION: R5-Q28] Dropping a withdrawn market from the Gate 12 lanes is our
// reading — post-market surveillance may still be owed for product already sold
// there. Gates 10-11 and supersession are not in doubt: nothing more is going to
// be launched or transitioned in a market the product has left.
export function activeMarkets(project: ProjectData): string[] {
  const withdrawn = new Set(currentMarketTracks(project).filter(isMarketWithdrawn).map((t) => t.market));
  return project.identity.markets.filter((m) => m.trim() !== '' && !withdrawn.has(m));
}

// Question 14's five project-level statuses. Deliberately DERIVED rather than
// stored: a stored roll-up is a second copy of the per-market records, and the
// answer's own warning is that "the launch of the first market must not cause all
// other markets to be treated as launched" — which is exactly what a stored
// summary drifting out of date would do.
export function projectLaunchStatus(project: ProjectData): ProjectLaunchStatus {
  const tracks = currentMarketTracks(project);
  if (tracks.length === 0) return 'Not launched';
  if (tracks.every(isMarketWithdrawn) && legacyOnMarketTracks(project).length === 0) return 'Withdrawn';
  // A formula version mid-transition is a project-level fact — question 2 puts the
  // outgoing version into "Transition in Progress" — and question 14 gives the
  // roll-up a matching value. Checked before the launch counts so a transition is
  // not hidden behind "Launched in all active markets".
  if (project.formulaVersionHistory.some((v) => v.state === 'Transition in Progress' || v.state === 'Transition Approved')) {
    return 'Market transition in progress';
  }
  // A market counts as launched while any version is on sale there.
  const active = activeMarketTracks(project);
  const onSale = new Set(onMarketTracks(project).map((t) => t.market));
  const launched = active.filter((t) => onSale.has(t.market));
  if (launched.length === 0) return 'Not launched';
  return launched.length === active.length ? 'Launched in all active markets' : 'Partially launched';
}

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  // Day-of-month clamped by Date itself (31 Jan + 1 month lands in March
  // otherwise); building from UTC keeps the result timezone-independent, which
  // matters because these dates are compared against a due date, not displayed.
  const base = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(d, lastDay));
  return base.toISOString().slice(0, 10);
}

export interface ReviewMilestone {
  market: string;
  milestone: string;
  dueDate: string;
}

// A materially changed formula is a Major one (A2, F5). The current version's own kind rides on `currentFormulaVersionRecord`.
function isMajorVersion(project: ProjectData, version: string): boolean {
  if (version === project.formulaVersion) return (project.currentFormulaVersionRecord?.changeType ?? 'Major') === 'Major';
  return project.formulaVersionHistory.find((v) => v.version === version)?.changeType === 'Major';
}

// Round 5 question 5(e): "A materially changed launched formula needs its own early performance/safety review milestones." A Major version
// launched in a market where the product was already on sale has the standard early reviews of its own, dated from ITS launch there
// (the first standard review, and the one-month review where enhanced surveillance applies); the market's schedule carries on from the
// first launch beside them. The milestone is named for the version, `F2.0:3m`. Our reading of which milestones are "early" is
// [ASSUMPTION: R6-Q11].
export function versionEarlyMilestones(project: ProjectData, opts: { enhanced: boolean }): ReviewMilestone[] {
  const anchors = new Map(reviewTracksByMarket(project).map((t) => [t.market, t]));
  const out: ReviewMilestone[] = [];
  for (const t of onMarketTracks(project)) {
    if (anchors.get(t.market) === t || !isMajorVersion(project, t.formulaVersion)) continue;
    const launch = text(t.actualLaunchDate);
    if (launch === '') continue;
    if (opts.enhanced) {
      out.push({ market: t.market, milestone: `${t.formulaVersion}:1m`, dueDate: addMonths(launch, POST_LAUNCH_REVIEW_SCHEDULE.enhancedFirstReviewMonths) });
    }
    out.push({ market: t.market, milestone: `${t.formulaVersion}:3m`, dueDate: addMonths(launch, POST_LAUNCH_REVIEW_SCHEDULE.standardFirstReviewMonths) });
  }
  return out;
}

// Everything the schedule lists: each market's ladder, then the early milestones of a materially changed version launched beside it.
export function reviewScheduleMilestones(
  project: ProjectData,
  opts: { enhanced: boolean; asOf: string; profiles?: readonly MarketProfile[] },
): ReviewMilestone[] {
  const ladder = reviewTracksByMarket(project).flatMap((track) =>
    reviewMilestonesFor(track, {
      enhanced: opts.enhanced,
      asOf: opts.asOf,
      intervalOverrideMonths: opts.profiles?.find((p) => p.market === track.market)?.reviewIntervalMonths,
    }),
  );
  return [...ladder, ...versionEarlyMilestones(project, { enhanced: opts.enhanced })];
}

// Question 13's schedule for one market: 1 month (enhanced-surveillance products
// only), 3 months, 12 months, then annually while the product remains marketed.
//
// `intervalOverrideMonths` is the answer's "the schedule is configurable where a
// particular product or market requires a different interval" — it comes from the
// Regulatory market profile, so a market with its own cadence needs no code change.
export function reviewMilestonesFor(
  track: MarketTrack,
  opts: { enhanced: boolean; asOf: string; intervalOverrideMonths?: number },
): ReviewMilestone[] {
  const launch = text(track.actualLaunchDate);
  if (launch === '') return [];
  const out: ReviewMilestone[] = [];
  const push = (milestone: string, months: number) =>
    out.push({ market: track.market, milestone, dueDate: addMonths(launch, months) });

  if (opts.intervalOverrideMonths && opts.intervalOverrideMonths > 0) {
    // A configured interval replaces the standard ladder rather than adding to it:
    // "where a particular product or market requires a DIFFERENT interval".
    for (let n = 1; ; n++) {
      const months = opts.intervalOverrideMonths * n;
      const due = addMonths(launch, months);
      if (due > opts.asOf) break;
      push(`${months}m`, months);
      if (n > 200) break; // guard: a 1-month interval over a very old launch
    }
    return out;
  }

  // The three fixed milestones are emitted whether or not they have come due yet.
  // They are a finite, known schedule the moment a launch date exists, and seeing
  // "12 months — due 2027-01-30" ahead of time is the point of a schedule; nothing
  // treats a future milestone as late, because `overdueReviews` filters on the due
  // date. The annual tail below cannot work that way — it is unbounded — so it
  // materialises only once due. The asymmetry is deliberate and was found by a
  // test asserting the opposite, which is why it is written down here rather than
  // left to be re-discovered.
  if (opts.enhanced) push('1m', POST_LAUNCH_REVIEW_SCHEDULE.enhancedFirstReviewMonths);
  push('3m', POST_LAUNCH_REVIEW_SCHEDULE.standardFirstReviewMonths);
  push('12m', POST_LAUNCH_REVIEW_SCHEDULE.fullReviewMonths);
  // "Annually thereafter while the product remains marketed" — up to `asOf` only.
  for (let year = 2; ; year++) {
    const months = 12 * year;
    const due = addMonths(launch, months);
    if (due > opts.asOf) break;
    out.push({ market: track.market, milestone: `annual-${year - 1}`, dueDate: due });
    if (year > 60) break;
  }
  return out;
}

// Milestones that have come due and have no completed review recorded against
// them. `asOf` is passed in rather than read from the clock: this is a pure
// function used by both the engine and the UI, and a rule whose answer depends on
// when it is called is not testable.
// The schedule a UI lists — same per-market view as overdueReviews.
export function reviewScheduleTracks(project: ProjectData): MarketTrack[] {
  return reviewTracksByMarket(project);
}

export function overdueReviews(
  project: ProjectData,
  opts: { enhanced: boolean; asOf: string; profiles?: readonly MarketProfile[] },
): ReviewMilestone[] {
  const done = new Set(
    project.postLaunchReviews
      .filter((r) => text(r.completedDate) !== '')
      .map((r) => `${r.market}|${r.milestone}`),
  );
  return reviewScheduleMilestones(project, opts).filter((m) => m.dueDate <= opts.asOf && !done.has(`${m.market}|${m.milestone}`));
}

// The words for a milestone, for every screen that names a review cycle.
const MILESTONE_LABELS: Record<string, string> = {
  '1m': 'One month (enhanced surveillance)',
  '3m': 'Three months (first standard review)',
  '12m': 'Twelve months (full post-market review)',
  signal: 'Signal-triggered review',
};
export function reviewMilestoneLabel(milestone: string): string {
  if (MILESTONE_LABELS[milestone]) return MILESTONE_LABELS[milestone];
  // A materially changed version's own early review: "F2.0:3m".
  const versioned = /^(.+):(1m|3m)$/.exec(milestone);
  if (versioned) return `${versioned[1]} — ${MILESTONE_LABELS[versioned[2]]}`;
  const annual = /^annual-(\d+)$/.exec(milestone);
  if (annual) return `Annual review ${annual[1]}`;
  return milestone;
}

// Every review cycle a post-market finding can belong to (Round 5 question 2(a): "linked to the review cycle"): each milestone the
// schedule generates for the markets that have launched, plus any review already recorded (a signal review exists only once recorded).
// The key is the same `market|milestone` the rest of this file matches reviews on.
export function reviewCycleOptions(
  project: ProjectData,
  opts: { enhanced: boolean; asOf: string; profiles?: readonly MarketProfile[] },
): { key: string; label: string }[] {
  const keys = new Map<string, string>();
  for (const m of reviewScheduleMilestones(project, opts)) {
    keys.set(`${m.market}|${m.milestone}`, `${m.market} — ${reviewMilestoneLabel(m.milestone)}`);
  }
  for (const r of project.postLaunchReviews) {
    const key = `${r.market}|${r.milestone}`;
    if (!keys.has(key)) keys.set(key, `${r.market} — ${reviewMilestoneLabel(r.milestone)}`);
  }
  return [...keys].map(([key, label]) => ({ key, label }));
}

// Reviews recorded but not finished — used by the UI to show what is in progress
// without treating it as done.
export function openReviews(project: ProjectData): PostLaunchReview[] {
  return project.postLaunchReviews.filter((r) => text(r.completedDate) === '');
}
