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

// "Active" markets are the ones still being sold into — a withdrawn market must
// not keep a project off "Launched in all active markets" forever.
export function activeMarketTracks(project: ProjectData): MarketTrack[] {
  return project.marketTracks.filter((t) => !isMarketWithdrawn(t));
}

// Question 14's five project-level statuses. Deliberately DERIVED rather than
// stored: a stored roll-up is a second copy of the per-market records, and the
// answer's own warning is that "the launch of the first market must not cause all
// other markets to be treated as launched" — which is exactly what a stored
// summary drifting out of date would do.
export function projectLaunchStatus(project: ProjectData): ProjectLaunchStatus {
  const tracks = project.marketTracks;
  if (tracks.length === 0) return 'Not launched';
  if (tracks.every(isMarketWithdrawn)) return 'Withdrawn';
  // A formula version mid-transition is a project-level fact — question 2 puts the
  // outgoing version into "Transition in Progress" — and question 14 gives the
  // roll-up a matching value. Checked before the launch counts so a transition is
  // not hidden behind "Launched in all active markets".
  if (project.formulaVersionHistory.some((v) => v.state === 'Transition in Progress' || v.state === 'Transition Approved')) {
    return 'Market transition in progress';
  }
  const active = activeMarketTracks(project);
  const launched = active.filter(isMarketLaunched);
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
export function overdueReviews(
  project: ProjectData,
  opts: { enhanced: boolean; asOf: string; profiles?: readonly MarketProfile[] },
): ReviewMilestone[] {
  const done = new Set(
    project.postLaunchReviews
      .filter((r) => text(r.completedDate) !== '')
      .map((r) => `${r.market}|${r.milestone}`),
  );
  return activeMarketTracks(project)
    .flatMap((track) =>
      reviewMilestonesFor(track, {
        enhanced: opts.enhanced,
        asOf: opts.asOf,
        intervalOverrideMonths: opts.profiles?.find((p) => p.market === track.market)?.reviewIntervalMonths,
      }),
    )
    .filter((m) => m.dueDate <= opts.asOf && !done.has(`${m.market}|${m.milestone}`));
}

// Reviews recorded but not finished — used by the UI to show what is in progress
// without treating it as done.
export function openReviews(project: ProjectData): PostLaunchReview[] {
  return project.postLaunchReviews.filter((r) => text(r.completedDate) === '');
}
