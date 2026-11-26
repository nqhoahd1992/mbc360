// Round 5 question 30 (SME answer, 2026-11-05): "Yes, Regulatory maintains versioned market profiles with source, effective date and reviewer. Link the
// applicable profile requirements to the project's packaging/artwork checklist. Gate 6 closes identification/assignment of those requirements; Gate 10
// verifies compliant final artwork/dossier; Gate 11 verifies the approved version for release. A filled market-profile field is not proof of product
// compliance. Blank is unassessed; N/A needs a reviewed rationale. Relevant profile changes trigger the impact assessment described in Question 1(d)."
//
// One reading for the screen and the server. Our readings (`[ASSUMPTION: R6-Q38]`): the requirements of a market are one block on its profile (not split
// line by line); a project carries one checklist row per market it sells in that has requirements, kept in its own register; identifying and assigning
// a row, and verifying it, are each an act recorded in the person's own name with the profile revision it stood on, so a profile change makes both stale;
// a market whose profile says nothing is unassessed and holds Gate 6, whatever the market is.
import { activeMarkets } from './postLaunch';
import type { MarketProfile, ProjectData, RegisterRow } from '../types';

export const MARKET_PACK_REGISTER = 'marketPackChecklist';

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim());

export type PackAssessment = 'requirements' | 'notApplicable' | 'unassessed';

// What Regulatory's profile of a market says about pack requirements: requirements, a reviewed "not applicable", or nothing (unassessed).
export function packAssessmentOf(profile: MarketProfile | undefined): PackAssessment {
  if (!profile) return 'unassessed';
  if (text(profile.packRequirements) !== '') return 'requirements';
  if (profile.packRequirementsNa && text(profile.packRequirementsRationale) !== '') return 'notApplicable';
  return 'unassessed';
}

const profileOf = (project: Pick<ProjectData, 'reference'>, market: string) => project.reference?.marketProfiles?.find((p) => p.market === market);

// The markets this project sells into (or the lane asked about).
function marketsOf(project: ProjectData, market?: string): string[] {
  return market ? [market] : activeMarkets(project);
}

// The trigger's three states: any market not assessed holds the item; any market with requirements applies it; otherwise it does not apply.
export function marketPackTrigger(project: ProjectData): 'applies' | 'doesNotApply' | 'notAssessed' {
  const markets = marketsOf(project);
  if (markets.length === 0) return 'doesNotApply';
  const states = markets.map((m) => packAssessmentOf(profileOf(project, m)));
  if (states.includes('unassessed')) return 'notAssessed';
  return states.includes('requirements') ? 'applies' : 'doesNotApply';
}

export function marketsNeedingPackChecklist(project: ProjectData, market?: string): string[] {
  return marketsOf(project, market).filter((m) => packAssessmentOf(profileOf(project, m)) === 'requirements');
}

const rowOf = (project: ProjectData, market: string): RegisterRow | undefined => (project.registers[MARKET_PACK_REGISTER] ?? []).find((r) => text(r.market) === market);

// Gate 6: every market with requirements has them identified and assigned, on the profile as it now stands.
export function marketPackIdentificationGaps(project: ProjectData, market?: string): string[] {
  const out: string[] = [];
  for (const m of marketsOf(project, market)) {
    const profile = profileOf(project, m);
    if (packAssessmentOf(profile) === 'unassessed') {
      out.push(`${m}: Regulatory has not assessed pack requirements on the market profile (blank is unassessed)`);
      continue;
    }
    if (packAssessmentOf(profile) !== 'requirements') continue;
    const row = rowOf(project, m);
    if (!row) out.push(`${m}: its pack requirements are not on the packaging checklist yet`);
    else if (text(row.owner) === '') out.push(`${m}: nobody is assigned to meet its pack requirements`);
    else if (text(row.identifiedBy) === '') out.push(`${m}: its pack requirements are not identified and assigned (recorded by a person)`);
    else if (text(row.identifiedRevision) !== String(profile?.revision ?? '')) out.push(`${m}: the market profile changed (revision ${profile?.revision}) since it was identified — identify it again`);
  }
  return out;
}

// Gate 10 ('final'): the final artwork / dossier is verified compliant (or a reviewed N/A); Gate 11 ('release'): the same, and the approved version being released
// is named. Both on the profile as it now stands. A filled profile field is not proof.
export function marketPackComplianceGaps(project: ProjectData, market?: string, stage: 'final' | 'release' = 'final'): string[] {
  const out: string[] = [];
  for (const m of marketsNeedingPackChecklist(project, market)) {
    const profile = profileOf(project, m);
    const row = rowOf(project, m);
    if (!row) {
      out.push(`${m}: no pack requirements checklist row`);
      continue;
    }
    const status = text(row.complianceStatus);
    if (status === 'Compliant') {
      if (text(row.complianceEvidence) === '') out.push(`${m}: compliant, but the final artwork / dossier evidence is not named`);
    } else if (status === 'N/A') {
      if (text(row.complianceRationale) === '') out.push(`${m}: N/A without its reviewed rationale`);
    } else {
      out.push(`${m}: compliance is ${status || 'Not assessed'}, not verified`);
      continue;
    }
    if (stage === 'release' && text(row.releaseVerifiedVersion) === '') out.push(`${m}: the approved version verified for release is not named`);
    if (text(row.verifiedBy) === '') out.push(`${m}: nobody has verified it (recorded by a person)`);
    else if (text(row.verifiedRevision) !== String(profile?.revision ?? '')) out.push(`${m}: the market profile changed (revision ${profile?.revision}) since it was verified — verify it again`);
  }
  return out;
}

// The server records the profile revision an identification or a verification stood on — never taken from the request.
export function stampMarketPackRevisions(project: ProjectData, committed: RegisterRow[], rows: RegisterRow[]): RegisterRow[] {
  const before = new Map(committed.filter((r) => text(r.market) !== '').map((r) => [text(r.market), r]));
  return rows.map((row) => {
    const old = before.get(text(row.market));
    const revision = String(profileOf(project, text(row.market))?.revision ?? '');
    const identified = text(row.identifiedBy) !== '';
    const identifiedFresh = identified && (!old || text(old.identifiedBy) !== text(row.identifiedBy) || text(old.identifiedRevision) === '');
    const verified = text(row.verifiedBy) !== '' && ['Compliant', 'N/A'].includes(text(row.complianceStatus));
    const verifiedFresh = verified && (!old || text(old.verifiedBy) !== text(row.verifiedBy) || text(old.complianceStatus) !== text(row.complianceStatus) || text(old.verifiedRevision) === '');
    return {
      ...row,
      identifiedRevision: identified ? (identifiedFresh ? revision : text(old?.identifiedRevision)) : '',
      verifiedRevision: verified ? (verifiedFresh ? revision : text(old?.verifiedRevision)) : '',
    };
  });
}

// What the register shows beside what a person entered: the market's requirements as the profile states them now, its revision, and whether either act is stale.
export function deriveMarketPackRows(project: ProjectData, rows: RegisterRow[]): RegisterRow[] {
  const have = new Set(rows.map((r) => text(r.market)));
  const virtual: RegisterRow[] = marketsNeedingPackChecklist(project)
    .filter((m) => !have.has(m))
    .map((m) => ({ market: m, complianceStatus: 'Not assessed' }));
  return [...rows, ...virtual].map((row) => {
    const profile = profileOf(project, text(row.market));
    const current = String(profile?.revision ?? '');
    const stale = (text(row.identifiedRevision) !== '' && text(row.identifiedRevision) !== current) || (text(row.verifiedRevision) !== '' && text(row.verifiedRevision) !== current);
    return { ...row, requirements: text(profile?.packRequirements), profileRevision: current, profileChanged: stale ? 'Yes' : '' };
  });
}
