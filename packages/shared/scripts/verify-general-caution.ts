// Round 5 question 16: the general restricted-and-caution assessment — the company's approved list, the Key Gate Check "with evidence, never N/A",
// Gate 4 disposition and Gate 7 closure, and the outcome rules. Pure functions over a hand-built project on the real rule engine.
// Run: npm run verify:general-caution
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { GATE_READINESS } from '../src/config/gateReadiness';
import { gateReadinessChecklist } from '../src/utils/gateProgress';
import {
  GC_MORE_INFO,
  GC_NEEDS_SAFETY,
  GC_NOT_SELECTED,
  GC_NO_ISSUE,
  GC_RESTRICTED,
  GC_WITHIN_LIMIT,
  generalCautionAuthority,
  generalCautionGaps,
  newlyAcceptedGeneralCautionRows,
} from '../src/utils/generalCaution';
import {
  applyRestrictedCautionInheritance,
  isCurrentRestrictedCaution,
  newRestrictedCautionLinkProblems,
  restrictedCautionInheritedValue,
  restrictedCautionLinkOf,
  restrictedCautionLinkGap,
  restrictedCautionMatches,
  restrictedCautionMatchesNotTakenUp,
  restrictedCautionProblems,
  restrictedCautionStatusOf,
} from '../src/utils/restrictedCaution';
import { missingRequiredColumns, REGISTER_CONFIGS } from '../src/config/registers';
import type { NextAction, ProjectData, RegisterRow, RestrictedCautionEntry } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const TODAY = '2026-11-14';
// The project carries one approved, current entry of the company list (e1); a row links to it unless a test says otherwise.
const base = (): ProjectData => {
  const p = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
  p.reference = { ...p.reference, restrictedCaution: [entry()] };
  return p;
};
// A row names the company list entry it was assessed against, at that entry's version (SW-59: a blank link is itself a gap).
const row = (over: RegisterRow = {}): RegisterRow => ({ ingredientInci: 'Phenoxyethanol', restrictedCautionId: 'e1', sourceVersion: '2026-A', ...over });
const action = (over: Partial<NextAction> = {}): NextAction =>
  ({ id: 'na-1', gateId: 'SG07', description: 'Confirm the limit', owner: 'Anna', dueDate: '2026-12-01', priority: 'Medium', status: 'Open', completionCriteria: 'Limit confirmed', escalationTrigger: 'Overdue', ...over }) as NextAction;
const entry = (over: Partial<RestrictedCautionEntry> = {}): RestrictedCautionEntry => ({
  id: 'e1', ingredient: 'Phenoxyethanol', kind: 'Restricted', markets: [], sourceReference: 'EU Cosmetics Regulation Annex V', version: '2026-A',
  effectiveFrom: '2026-01-01', status: 'Approved', approvedByRegulatory: 'R', approvedBySafety: 'S', revision: 2, ...over,
});
const gaps = (p: ProjectData, r: RegisterRow, gate: 'SG04' | 'SG07') => generalCautionGaps(p, r, gate);
const item = (p: ProjectData, gateId: string, id: string) => gateReadinessChecklist(p, gateId).find((i) => i.id === id);

// --- the outcomes ------------------------------------------------------------------------------------------------------------------
{
  const p = base();
  t('a blank outcome is no disposition, at either gate', gaps(p, row(), 'SG04').length > 0 && gaps(p, row(), 'SG07').length > 0);
  t('"No issue identified" closes a row', gaps(p, row({ assessmentOutcome: GC_NO_ISSUE }), 'SG07').length === 0);
  t('"Considered - not selected" closes a row', gaps(p, row({ assessmentOutcome: GC_NOT_SELECTED }), 'SG07').length === 0);
  t('"Restricted - reformulate" blocks at both gates until corrected', gaps(p, row({ assessmentOutcome: GC_RESTRICTED }), 'SG04').length > 0 && gaps(p, row({ assessmentOutcome: GC_RESTRICTED }), 'SG07').length > 0);
  const within = row({ assessmentOutcome: GC_WITHIN_LIMIT });
  t('"Within limit" needs exposure, markets and evidence', gaps(p, within, 'SG07').length === 3);
  t('...and is closed once it has them', gaps(p, { ...within, formulaExposure: '0.8% leave-on', markets: 'Vietnam', evidenceLink: 'https://x' }, 'SG07').length === 0);
  const cfg = REGISTER_CONFIGS.find((c) => c.key === 'generalRestrictedCaution')!;
  t('the register itself refuses to save "Within limit" without them (requiredWhen)', missingRequiredColumns(cfg, within).map((c) => c.key).sort().join() === 'evidenceLink,formulaExposure,markets');
  t('the two new outcomes are in the list', ['Further information required', 'Considered - not selected'].every((o) => cfg.columns.find((c) => c.key === 'assessmentOutcome')?.options?.includes(o)));
}

// --- flagged findings: a trail at Gate 4, acceptance at Gate 7 ------------------------------------------------------------------------------
{
  const p = base();
  p.nextActions = [action()];
  const flagged = row({ assessmentOutcome: GC_NEEDS_SAFETY });
  t('a flagged finding at Gate 4 needs its reviewer trail', gaps(p, flagged, 'SG04').length === 4);
  const trail = { reviewerAssessment: 'Critical', reviewer: 'Sam', reviewDate: '2026-11-10', reviewRationale: 'Needs a limit check' };
  t('...and with the trail it is dispositioned at Gate 4', gaps(p, { ...flagged, ...trail }, 'SG04').length === 0);
  t('...but at Gate 7 it still blocks: nobody accepted it', gaps(p, { ...flagged, ...trail }, 'SG07').length > 0);
  const accepted = { ...flagged, ...trail, reviewerAssessment: 'Non-critical', linkedNextActionId: 'na-1' };
  t('accepted as a non-critical residual action with a live tracked action, Gate 7 lets it through', gaps(p, accepted, 'SG07').length === 0);
  t('...not without that action', gaps(p, { ...accepted, linkedNextActionId: '' }, 'SG07').length > 0);
  p.nextActions = [action({ status: 'Cancelled' })];
  t('...nor with a cancelled one', gaps(p, accepted, 'SG07').length > 0);
  t('"Further information required" is flagged like the others', gaps(base(), row({ assessmentOutcome: GC_MORE_INFO }), 'SG04').length === 4);
  t('the review an outcome names decides who may accept it', JSON.stringify(generalCautionAuthority(flagged)) === '["safety"]' && generalCautionAuthority(row({ assessmentOutcome: GC_MORE_INFO })).length === 2);
  t('the act of accepting is found by the Non-critical assessment newly set', newlyAcceptedGeneralCautionRows([flagged], [{ ...flagged, reviewerAssessment: 'Non-critical' }]).length === 1 && newlyAcceptedGeneralCautionRows([accepted], [accepted]).length === 0);
}

// --- the readiness items ------------------------------------------------------------------------------------------------------------------
{
  const p = base();
  t('Gate 4 lists the general screening', !!item(p, 'SG04', 'sg04-general-caution'));
  t('an empty register is a valid answer at Gate 4', item(p, 'SG04', 'sg04-general-caution')?.satisfied === true);
  p.registers['generalRestrictedCaution'] = [row()];
  t('a row with no outcome blocks Gate 4 as a hard block', item(p, 'SG04', 'sg04-general-caution')?.satisfied === false && item(p, 'SG04', 'sg04-general-caution')?.hardBlock === true);
  const g7 = GATE_READINESS['SG07'].find((r) => r.id === 'sg07-general-caution')!;
  const legs = (g7.check as { checks: { kind: string; strict?: boolean; needsEvidence?: boolean }[] }).checks;
  t('the Gate 7 Key Gate Check never accepts N/A and needs its evidence and initials', legs.some((c) => c.kind === 'gateCheckDone' && c.strict === true && c.needsEvidence === true));
  const q = base();
  const gc = q.gateChecks.find((c) => c.gate === '07' && c.check === 'General restricted and caution ingredient assessment completed')!;
  gc.done = true;
  gc.ynna = 'Y' as never;
  t('done with no evidence is not enough', item(q, 'SG07', 'sg07-general-caution')?.satisfied === false);
  gc.evidenceRef = 'Screening report v3';
  t('...nor evidence with no initials', item(q, 'SG07', 'sg07-general-caution')?.satisfied === false);
  gc.initials = 'SD';
  t('done, with evidence and initials, an empty register passes Gate 7 ("no findings means Complete with evidence")', item(q, 'SG07', 'sg07-general-caution')?.satisfied === true);
}

// --- the company list ------------------------------------------------------------------------------------------------------------------
{
  t('a new entry is Proposed until both functions approve', restrictedCautionStatusOf({}) === 'Proposed' && restrictedCautionStatusOf({ approvedByRegulatory: 'R' }) === 'Proposed');
  t('Approved needs BOTH approvals', restrictedCautionStatusOf({ approvedByRegulatory: 'R', approvedBySafety: 'S' }) === 'Approved');
  t('a withdrawn entry stays withdrawn', restrictedCautionStatusOf({ approvedByRegulatory: 'R', approvedBySafety: 'S' }, true) === 'Withdrawn');
  t('an entry needs its source, version and effective date', restrictedCautionProblems({ ingredient: 'X', kind: 'Caution' }).length === 3);
  t('...and an end date after its start', restrictedCautionProblems({ ...entry(), effectiveTo: '2025-01-01' }).length === 1);
  t('only an approved entry that is in effect is current', isCurrentRestrictedCaution(entry(), TODAY));
  t('...a proposed one is not', !isCurrentRestrictedCaution(entry({ status: 'Proposed' }), TODAY));
  t('...nor one not yet in effect', !isCurrentRestrictedCaution(entry({ effectiveFrom: '2027-01-01' }), TODAY));
  t('...nor an expired one', !isCurrentRestrictedCaution(entry({ effectiveTo: '2026-06-30' }), TODAY));
  t('...nor a withdrawn one', !isCurrentRestrictedCaution(entry({ status: 'Withdrawn' }), TODAY));

  const p = base();
  p.bom = [{ inciName: 'Phenoxyethanol', casNo: '122-99-6' } as never, { inciName: 'Aqua' } as never];
  p.reference = { ...p.reference, restrictedCaution: [entry(), entry({ id: 'e2', ingredient: 'Other', casNo: '122-99-6', markets: [] })] };
  t('a formula ingredient matches by INCI name', restrictedCautionMatches(p, TODAY).some((m) => m.entry.id === 'e1'));
  t('...and by CAS number', restrictedCautionMatches(p, TODAY).some((m) => m.entry.id === 'e2'));
  p.reference = { ...p.reference, restrictedCaution: [entry({ markets: ['Australia'] })] };
  t('an entry for another market does not apply', restrictedCautionMatches(p, TODAY).length === 0);
  p.reference = { ...p.reference, restrictedCaution: [entry({ status: 'Proposed' })] };
  t('a proposed entry is not loaded', restrictedCautionMatches(p, TODAY).length === 0);
  p.reference = { ...p.reference, restrictedCaution: [entry()] };
  t('an approved match not taken up as a row is listed', restrictedCautionMatchesNotTakenUp(p, TODAY).length === 1);
  p.registers['generalRestrictedCaution'] = [row({ restrictedCautionId: '', ingredientInci: 'phenoxyethanol ' })];
  t('...a row that only types the ingredient name does NOT take it up (SW-59: linked by the entry, not by a retyped name)', restrictedCautionMatchesNotTakenUp(p, TODAY).length === 1);
  p.registers['generalRestrictedCaution'] = [row({ restrictedCautionId: 'e1' })];
  t('...a row linked to the entry takes it up', restrictedCautionMatchesNotTakenUp(p, TODAY).length === 0);
  p.registers['generalRestrictedCaution'] = [row({ restrictedCautionId: 'e-other' })];
  t('...a row linked to a different entry does not', restrictedCautionMatchesNotTakenUp(p, TODAY).length === 1);
}

// --- SW-59: the row links to the entry by a picked record, and the cells it takes from it are filled and locked ------------------------------
{
  const cfg = REGISTER_CONFIGS.find((c) => c.key === 'generalRestrictedCaution')!;
  const col = (key: string) => cfg.columns.find((c) => c.key === key)!;
  t('the register has the link column, a picked reference (not text)', col('restrictedCautionId')?.type === 'restrictedCautionRef');
  t('...and the cells that restate the list are marked as read from the entry',
    ['ingredientInci', 'restrictionBasis', 'sourceReference', 'sourceVersion', 'markets'].every((k) => !!col(k).inheritFromEntry));
  t('...but what the reviewer decides is typed (outcome, reviewer, rationale, evidence)', ['assessmentOutcome', 'reviewer', 'reviewRationale', 'evidenceLink', 'formulaExposure'].every((k) => !col(k).inheritFromEntry));

  const e1 = entry({ condition: 'max 1% leave-on', markets: ['Vietnam', 'Australia'] });
  const e2 = entry({ id: 'e2', ingredient: 'Lilial', kind: 'Prohibited', markets: [], sourceReference: 'EU Annex II', version: '2026-B' });
  t('the basis is the kind with its limit', restrictedCautionInheritedValue('basis', e1) === 'Restricted: max 1% leave-on' && restrictedCautionInheritedValue('basis', e2) === 'Prohibited');

  const typed = row({ restrictedCautionId: 'e1', ingredientInci: 'forged', restrictionBasis: 'forged', sourceReference: 'forged', sourceVersion: 'forged', markets: 'Thailand', assessmentOutcome: GC_NO_ISSUE });
  const [filled] = applyRestrictedCautionInheritance(cfg, [typed], [e1, e2]);
  t('saving copies ingredient, basis, source, version and markets from the entry, whatever the request carried',
    filled.ingredientInci === 'Phenoxyethanol' && filled.restrictionBasis === 'Restricted: max 1% leave-on' && filled.sourceReference === 'EU Cosmetics Regulation Annex V' && filled.sourceVersion === '2026-A' && filled.markets === 'Vietnam, Australia');
  t('...and leaves what the reviewer decided alone', filled.assessmentOutcome === GC_NO_ISSUE);
  const [noMarkets] = applyRestrictedCautionInheritance(cfg, [row({ restrictedCautionId: 'e2', markets: 'Vietnam' })], [e1, e2]);
  t('an entry that names no market leaves the markets cell as the reviewer typed it', noMarkets.markets === 'Vietnam');
  const [stale] = applyRestrictedCautionInheritance(cfg, [row({ restrictedCautionId: 'gone', ingredientInci: 'Old name' })], [e1, e2]);
  t('a row linked to an entry that is no longer current is not rewritten', stale.ingredientInci === 'Old name');

  t('a new link to an entry that is not approved and current is refused', newRestrictedCautionLinkProblems([], [row({ restrictedCautionId: 'nope' })], [e1]).length === 1);
  t('...a new link to a current entry is accepted', newRestrictedCautionLinkProblems([], [row({ restrictedCautionId: 'e1' })], [e1]).length === 0);
  // There is no "not on the list" option (project owner, 2026-11-23): a value saved while there was one counts as no link, and cannot be chosen now.
  t('...the old "not-listed" value cannot be newly saved', newRestrictedCautionLinkProblems([], [row({ restrictedCautionId: 'not-listed' })], [e1]).length === 1);
  t('...and a row still holding it counts as having no link', restrictedCautionLinkOf(row({ restrictedCautionId: 'not-listed' })) === '' && !!restrictedCautionLinkGap(row({ restrictedCautionId: 'not-listed' }), [e1]));
  t('...a link the row already had stays even when its entry is gone', newRestrictedCautionLinkProblems([row({ restrictedCautionId: 'gone' })], [row({ restrictedCautionId: 'gone' })], [e1]).length === 0);

  // The project carries EVERY entry of the company list, so "available" is decided by the rule, not by being in the array.
  const proposed = entry({ id: 'e3', status: 'Proposed', approvedBySafety: undefined });
  const withdrawn = entry({ id: 'e4', status: 'Withdrawn' });
  t('a new link to an entry that is only Proposed, or Withdrawn, is refused', newRestrictedCautionLinkProblems([], [row({ restrictedCautionId: 'e3' }), row({ restrictedCautionId: 'e4' })], [proposed, withdrawn]).length === 2);
  const [fromProposed] = applyRestrictedCautionInheritance(cfg, [row({ restrictedCautionId: 'e3', ingredientInci: 'Kept' })], [proposed]);
  t('...and nothing is copied from an entry that is not approved and current', fromProposed.ingredientInci === 'Kept');
  t('a row linked to an entry whose approvals were retracted by an edit is a gap until it is approved again', !!restrictedCautionLinkGap(row({ restrictedCautionId: 'e3', sourceVersion: '2026-A' }), [proposed]));
  t('a blank link is a gap: the row must name an entry', !!restrictedCautionLinkGap(row({ restrictedCautionId: '' }), [e1]));
  t('a link to a current entry at the same version is no gap', restrictedCautionLinkGap(row({ restrictedCautionId: 'e1', sourceVersion: '2026-A' }), [e1]) === undefined);
  t('a link to an entry that is no longer approved and current is a gap', !!restrictedCautionLinkGap(row({ restrictedCautionId: 'e1', sourceVersion: '2026-A' }), []));
  t('a link whose entry moved to a newer version is a gap until the row is saved again', !!restrictedCautionLinkGap(row({ restrictedCautionId: 'e1', sourceVersion: '2025-Z' }), [e1]));

  const p = base();
  p.reference = { ...p.reference, restrictedCaution: [e1] };
  t('a row with no link blocks both gates, whatever its outcome', gaps(p, row({ restrictedCautionId: '', assessmentOutcome: GC_NO_ISSUE }), 'SG04').length === 1 && gaps(p, row({ restrictedCautionId: '', assessmentOutcome: GC_NO_ISSUE }), 'SG07').length === 1);
  t('a linked row at the entry version with its outcome closes', gaps(p, row({ restrictedCautionId: 'e1', sourceVersion: '2026-A', assessmentOutcome: GC_NO_ISSUE }), 'SG07').length === 0);
  t('...and blocks when the entry changed version after it', gaps(p, row({ restrictedCautionId: 'e1', sourceVersion: '2025-Z', assessmentOutcome: GC_NO_ISSUE }), 'SG07').length === 1);
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
