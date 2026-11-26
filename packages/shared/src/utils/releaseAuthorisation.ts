// Round 5 question 28(b) (SME answer, 2026-11-05): "Record the technical stability/compatibility conclusion at Gate 9. Record the market/version-specific
// authorisation to release at Gate 11, linked to the approved Gate 9 evidence and Quality release pathway. Separate fields avoid confusing a successful
// test conclusion with launch permission. Actual batch release remains linked to the external GMP/Quality record."
//
// One reading for the screen and the server. Our readings (`[ASSUMPTION: R6-Q36]`): the authorisation is one row per market and formula version in its
// own register; a market is authorised for the project's CURRENT formula version when its row says Authorised, names the Gate 9 evidence it rests on and
// the Quality release pathway, and carries the signed-in person who authorised it; the batch release record is a link the authorisation may carry, never
// something this application decides.
import { RELEASE_AUTHORISATIONS, STABILITY_CONCLUSIONS } from '../config/releaseAuthorisation';
import { activeMarkets } from './postLaunch';
import type { ProjectData, RegisterRow } from '../types';

export const RELEASE_AUTHORISATION_REGISTER = 'releaseAuthorisation';
export { RELEASE_AUTHORISATIONS, STABILITY_CONCLUSIONS };

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim());

// What a market's release authorisation row still lacks; empty = it stands.
export function releaseAuthorisationGaps(row: RegisterRow): string[] {
  const gaps: string[] = [];
  if (text(row.authorisation) !== 'Authorised') gaps.push('the authorisation (it is not Authorised)');
  if (text(row.stabilityEvidence) === '') gaps.push('the approved Gate 9 stability and compatibility evidence it rests on');
  if (text(row.qualityPathway) === '') gaps.push('the Quality release pathway');
  if (text(row.authorisedBy) === '') gaps.push('who authorised the release');
  return gaps;
}

// The markets (all active ones, or the one lane asked about) with no standing authorisation for the project's current formula version.
export function marketsWithoutReleaseAuthorisation(project: ProjectData, market?: string): string[] {
  const rows = project.registers[RELEASE_AUTHORISATION_REGISTER] ?? [];
  const markets = market ? [market] : activeMarkets(project);
  return markets.flatMap((m) => {
    const mine = rows.filter((r) => text(r.market) === m && (text(r.formulaVersion) === '' || text(r.formulaVersion) === project.formulaVersion));
    if (mine.length === 0) return [`${m} (no release authorisation recorded for ${project.formulaVersion})`];
    return mine.some((r) => releaseAuthorisationGaps(r).length === 0) ? [] : [`${m} (${releaseAuthorisationGaps(mine[0])[0]})`];
  });
}
