// Round 5 question 6: a change to the Claims Library (and the other company lists) carries a proposed four-level criticality that a qualified
// function confirms, an urgent safety issue or mandatory restriction holds release at once, and what the change affects decides whether a
// Change Control is required. Pure functions. Run: npm run verify:impact-criticality
import { IMPACT_AFFECTS_NONE } from '../src/types';
import type { ImpactAssessmentRecord } from '../src/types';
import { newLinksToWithdrawnWording } from '../src/utils/claimEvidence';
import { IMPACT_FUNCTIONS, impactAwaitsConfirmation, impactConclusionProblem, impactFunctionsFor, impactIsHolding } from '../src/utils/impactAssessments';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const assessment = (over: Partial<ImpactAssessmentRecord>): ImpactAssessmentRecord => ({
  id: 'a', dataset: 'claims-library', subject: 'wording', summary: 's', critical: false, criticality: 'Medium', dueDate: '2099-01-01',
  raisedBy: 'x', raisedAt: '2026-11-01T00:00:00Z', functionKeys: ['regulatory'], markets: [], conclusions: [], ...over,
});

// --- who assesses -------------------------------------------------------------------------------------------------------------------------
t('a Claims Library change is assessed by Technical, Regulatory and Quality', ['technical-claims-reviewer', 'regulatory', 'quality'].every((k) => IMPACT_FUNCTIONS['claims-library'].includes(k)));
t('a safety issue brings Safety in', impactFunctionsFor('claims-library', { safetyIssue: true }).includes('safety-scientific'));
t('without one Safety is not asked of a claims change', !impactFunctionsFor('claims-library', {}).includes('safety-scientific'));
t('an urgent change is escalated to Safety, Regulatory and Quality', ['safety-scientific', 'regulatory', 'quality'].every((k) => impactFunctionsFor('market-profile', { urgent: true }).includes(k)));

// --- when release is held -----------------------------------------------------------------------------------------------------------------
{
  t('a change that is not Critical holds nothing', !impactIsHolding(assessment({ critical: false, criticality: 'High' })));
  const proposed = assessment({ critical: true, criticality: 'Critical' });
  t('a proposed Critical change holds nothing until a function confirms it', !impactIsHolding(proposed) && impactAwaitsConfirmation(proposed));
  t('...once confirmed it holds release', impactIsHolding({ ...proposed, criticalConfirmed: { by: 'S', functionKey: 'regulatory', at: '2026-11-02T00:00:00Z' } }));
  t('an urgent Critical change holds at once, with no confirmation', impactIsHolding({ ...proposed, urgent: true }) && !impactAwaitsConfirmation({ ...proposed, urgent: true }));
  t('a concluded assessment holds nothing', !impactIsHolding({ ...proposed, urgent: true, concludedAt: '2026-11-03T00:00:00Z' }));
}

// --- the Claims Library conclusion: what the change affects decides whether a Change Control is required ---------------------------------------
{
  const chg = ['CHG-1'];
  const ok = (input: Parameters<typeof impactConclusionProblem>[0]) => impactConclusionProblem(input, chg, 'claims-library');
  t('a change that affects released wording must say so and link a Change Control',
    ok({ conclusion: 'Impact on this project', rationale: 'r', affects: ['Approved or released wording'], linkedChangeId: 'CHG-1' }) === null);
  t('...affecting released wording and concluding "No impact" is refused', !!ok({ conclusion: 'No impact', rationale: 'r', affects: ['Approved or released wording'] }));
  t('...each of artwork, PIF and authorised market use needs the Change Control too',
    ['Artwork', 'PIF', 'Authorised market use'].every((a) => !!ok({ conclusion: 'No impact', rationale: 'r', affects: [a] })));
  t('an impact with no Change Control linked is refused', !!ok({ conclusion: 'Impact on this project', rationale: 'r', affects: ['PIF'] }));
  t('an unused entry or an editorial correction closes with a reason and no Change Control',
    ok({ conclusion: 'No impact', rationale: 'editorial correction only', affects: [IMPACT_AFFECTS_NONE] }) === null);
  t('...but without its reason it does not', !!ok({ conclusion: 'No impact', rationale: '', affects: [IMPACT_AFFECTS_NONE] }));
  t('"affects nothing" cannot be combined with something it affects', !!ok({ conclusion: 'No impact', rationale: 'r', affects: [IMPACT_AFFECTS_NONE, 'PIF'] }));
  t('"affects nothing" cannot conclude as an impact', !!ok({ conclusion: 'Impact on this project', rationale: 'r', affects: [IMPACT_AFFECTS_NONE], linkedChangeId: 'CHG-1' }));
  t('what the change affects must be said', !!ok({ conclusion: 'No impact', rationale: 'r' }));
  t('the other company lists are not asked what they affect', impactConclusionProblem({ conclusion: 'No impact', rationale: 'r' }, chg, 'rm-risk') === null);
}

// --- further use of withdrawn wording is suspended ----------------------------------------------------------------------------------------
{
  const library = [{ id: 'L1', status: 'Approved' }, { id: 'L2', status: 'Withdrawn' }];
  t('a claim cannot be newly linked to withdrawn wording', newLinksToWithdrawnWording([{ claimId: 'C1', libraryEntryId: '' }], [{ claimId: 'C1', libraryEntryId: 'L2' }], library).join() === 'C1');
  t('...a link it already had stays', newLinksToWithdrawnWording([{ claimId: 'C1', libraryEntryId: 'L2' }], [{ claimId: 'C1', libraryEntryId: 'L2' }], library).length === 0);
  t('...current wording can be linked', newLinksToWithdrawnWording([{ claimId: 'C1', libraryEntryId: '' }], [{ claimId: 'C1', libraryEntryId: 'L1' }], library).length === 0);
  t('...and so can no wording at all', newLinksToWithdrawnWording([], [{ claimId: 'C2', libraryEntryId: '' }], library).length === 0);
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
