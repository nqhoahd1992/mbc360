// Round 5 question 28: when the evidence basis and the release decision are recorded. (a) the evidence basis is a plan proposed at Gate 3, confirmed before
// Gate 5, demonstrated at Gate 8 and confirmed against the final wording at Gate 10, and a finished-product effect is never exempted by an ingredient-level
// basis; (b) the stability conclusion is Gate 9's and the release authorisation is a market- and version-specific record at Gate 11. Pure functions on the real
// rule code. Run: npm run verify:evidence-basis
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { clearConfirmedPlansOnNewRevision, evidenceBasisContradictions, frozenRevisionEdits } from '../src/utils/claimEvidence';
import { evaluateTrigger, gateBlockers } from '../src/utils/gateProgress';
import { marketsWithoutReleaseAuthorisation, releaseAuthorisationGaps } from '../src/utils/releaseAuthorisation';
import type { ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const claim = (over: RegisterRow = {}): RegisterRow => ({ claimId: 'CLM-001', claimCategory: 'Cosmetic', claimScope: '', evidenceBasisRequired: 'Product-level evidence', claimsProductEffect: 'Yes', revision: 1, ...over });
const project = (claims: RegisterRow[] = [], extra: Record<string, RegisterRow[]> = {}): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam', 'Australia'], reviewers: {} } as never);
  p.registers = { ...p.registers, claimEvidenceTraceability: claims, ...extra };
  p.formulaVersion = 'F1.0';
  return p;
};
const blocked = (p: ProjectData, gate: string, id: string, market?: string) => gateBlockers(p, gate, 'Proceed with Conditions', market).some((b) => b.id === id);

// the exemption
t('an ingredient-level basis exempts a Cosmetic claim only when the claim says it claims no finished-product effect', evaluateTrigger(project([claim({ evidenceBasisRequired: 'Ingredient-level evidence', claimsProductEffect: 'No' })]), 'claimNeedsPerformanceEvidence') === 'doesNotApply');
t('...not when it says nothing, nor when it says it does', evaluateTrigger(project([claim({ evidenceBasisRequired: 'Ingredient-level evidence', claimsProductEffect: '' })]), 'claimNeedsPerformanceEvidence') === 'applies' && evaluateTrigger(project([claim({ evidenceBasisRequired: 'Ingredient-level evidence', claimsProductEffect: 'Yes' })]), 'claimNeedsPerformanceEvidence') === 'applies');
t('"No performance claim" is exempt on the same condition', evaluateTrigger(project([claim({ evidenceBasisRequired: 'No performance claim', claimsProductEffect: 'No' })]), 'claimNeedsPerformanceEvidence') === 'doesNotApply');
t('a claimed finished-product effect with an exempting basis is a contradiction, refused on save', evidenceBasisContradictions([claim({ evidenceBasisRequired: 'Ingredient-level evidence' })]).length === 1 && evidenceBasisContradictions([claim()]).length === 0 && evidenceBasisContradictions([claim({ evidenceBasisRequired: 'Ingredient-level evidence', claimsProductEffect: 'No' })]).length === 0);

// the plan: confirmed before Gate 5, frozen, re-confirmed through a revision of that claim alone
{
  const confirmed = claim({ evidencePlanConfirmedBy: 'Q', evidencePlanConfirmedDate: '2026-11-01' });
  t('a confirmed plan freezes the evidence basis: changing it without a new revision is refused', frozenRevisionEdits([confirmed], [{ ...confirmed, evidenceBasisRequired: 'Ingredient-level evidence', claimsProductEffect: 'No' }]).length === 1);
  t('...a new revision is the sanctioned route', frozenRevisionEdits([confirmed], [{ ...confirmed, revision: 2, evidenceBasisRequired: 'Mechanism rationale' }]).length === 0);
  t('...the wording is not frozen by the plan alone (only an approved revision freezes it)', frozenRevisionEdits([confirmed], [{ ...confirmed, approvedWording: 'new words' }]).length === 0);
  t('an unconfirmed plan is still editable', frozenRevisionEdits([claim()], [claim({ evidenceBasisRequired: 'Mechanism rationale' })]).length === 0);
  const after = clearConfirmedPlansOnNewRevision([confirmed, claim({ claimId: 'CLM-002', evidencePlanConfirmedBy: 'Q' })], [{ ...confirmed, revision: 2 }, claim({ claimId: 'CLM-002', evidencePlanConfirmedBy: 'Q' })]);
  t('a new revision withdraws the confirmation of that claim alone', after[0].evidencePlanConfirmedBy === '' && after[1].evidencePlanConfirmedBy === 'Q');
}

// the gates
{
  t('Gate 5 asks for the confirmation of every in-scope claim', blocked(project([claim()]), 'SG05', 'sg05-evidence-plan-confirmed') && !blocked(project([claim({ evidencePlanConfirmedBy: 'Q' })]), 'SG05', 'sg05-evidence-plan-confirmed'));
  t('...a claim excluded from scope, or a product that declares no claims, needs none', !blocked(project([claim({ claimScope: 'Excluded — rejected concept' })]), 'SG05', 'sg05-evidence-plan-confirmed'));
  t('Gate 8 asks for what was actually demonstrated', blocked(project([claim()]), 'SG08', 'sg08-evidence-demonstrated') && !blocked(project([claim({ evidenceDemonstrated: 'Clinical study X' })]), 'SG08', 'sg08-evidence-demonstrated'));
  t('Gate 10 passes only a Yes: the demonstrated basis supports the final wording', blocked(project([claim()]), 'SG10', 'sg10-basis-supports-wording') && blocked(project([claim({ basisSupportsWording: 'No' })]), 'SG10', 'sg10-basis-supports-wording') && blocked(project([claim({ basisSupportsWording: 'Partly — the wording must change' })]), 'SG10', 'sg10-basis-supports-wording') && !blocked(project([claim({ basisSupportsWording: 'Yes' })]), 'SG10', 'sg10-basis-supports-wording'));
  t('Gate 3 also asks the finished-product-effect question', blocked(project([claim({ claimsProductEffect: '' })]), 'SG03', 'sg03-evidence-basis') && !blocked(project([claim()]), 'SG03', 'sg03-evidence-basis'));
}

// (b) the stability conclusion and the release authorisation
{
  const stab = (over: RegisterRow = {}): RegisterRow => ({ productSku: 'S', result: 'ok', stabilityConclusion: 'Meets criteria', ...over });
  const withStab = (rows: RegisterRow[]) => project([], { stabilityRelease: rows });
  t('Gate 9 needs a stability and compatibility conclusion that is not Not Started or Does not meet criteria', blocked(withStab([stab({ stabilityConclusion: 'Not Started' })]), 'SG09', 'sg09-stability-conclusion') && blocked(withStab([stab({ stabilityConclusion: 'Does not meet criteria' })]), 'SG09', 'sg09-stability-conclusion') && !blocked(withStab([stab()]), 'SG09', 'sg09-stability-conclusion') && !blocked(withStab([stab({ stabilityConclusion: 'Meets criteria with conditions' })]), 'SG09', 'sg09-stability-conclusion'));
  const auth = (over: RegisterRow = {}): RegisterRow => ({ market: 'Vietnam', formulaVersion: 'F1.0', authorisation: 'Authorised', stabilityEvidence: 'Report SR-1', qualityPathway: 'QA release SOP 12', authorisedBy: 'Quin', ...over });
  const withAuth = (rows: RegisterRow[]) => project([], { releaseAuthorisation: rows });
  t('a standing authorisation names the approved Gate 9 evidence, the Quality pathway and who authorised it', releaseAuthorisationGaps(auth()).length === 0 && releaseAuthorisationGaps(auth({ stabilityEvidence: '', qualityPathway: '', authorisedBy: '', authorisation: 'Pending' })).length === 4);
  t('release is held market by market: Vietnam authorised does not authorise Australia', marketsWithoutReleaseAuthorisation(withAuth([auth()]), 'Vietnam').length === 0 && marketsWithoutReleaseAuthorisation(withAuth([auth()]), 'Australia').length === 1);
  t('the authorisation is for the current formula version', marketsWithoutReleaseAuthorisation(withAuth([auth({ formulaVersion: 'F0.9' })]), 'Vietnam').length === 1);
  t('Gate 11 holds a market lane with no authorisation, and not the lane that has one', blocked(withAuth([auth()]), 'SG11', 'sg11-release-pathway', 'Australia') && !blocked(withAuth([auth()]), 'SG11', 'sg11-release-pathway', 'Vietnam'));
  t('a test conclusion alone is not launch permission: with only the stability result Gate 11 still holds', blocked(project([], { stabilityRelease: [stab()] }), 'SG11', 'sg11-release-pathway', 'Vietnam'));
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
