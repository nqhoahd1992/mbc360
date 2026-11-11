// Verifies which authority a flagged watch-list row needs from the people who accept it (SW-32, Round 5 question 8): a status
// that names a function decides it; otherwise the row's own Owner column does; an Owner naming both needs BOTH functions, and
// one naming neither sends the row to triage. Run on the REAL seeded rows of both registers.
// Run: npm run verify:watchlist-authority
import { REGISTER_CONFIGS } from '../src/config/registers';
import { newlyAcceptingActRows, newlyNamedReviewerRows, watchlistNeedsTriage, watchlistRowInScope, watchlistRequiredAuthority } from '../src/utils/watchlistReview';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const row = (group: string) => {
  for (const key of ['prohibitedIngredients', 'pbCautionLimits']) {
    const found = REGISTER_CONFIGS.find((c) => c.key === key)?.fixedRows?.find((r) => r.ingredientGroup === group);
    if (found) return { ...found };
  }
  throw new Error(`no seeded row "${group}"`);
};
const needs = (group: string, status: string) => watchlistRequiredAuthority({ ...row(group), productStatus: status }).join('+');
const M = 'REVIEW - possible formula match';

t('machine match, Owner Regulatory -> Regulatory only', needs('Parabens', M) === 'regulatory', needs('Parabens', M));
t('machine match, Owner Safety / R&I -> Safety only', needs('Essential oils', M) === 'safety', needs('Essential oils', M));
t('machine match, Owner Safety -> Safety only', needs('Arnica montana', M) === 'safety');
t('machine match, Owner Regulatory / Safety -> BOTH', needs('Retinol Retinyl Palmitate Tretinoin', M) === 'safety+regulatory');
t('machine match, Owner Safety / Regulatory -> BOTH', needs('BHT', M) === 'safety+regulatory');
t('machine match, Owner Quality (names neither) -> triage, nobody', needs('Heavy metals Pb Hg Cd As', M) === '');
t('...and that row is flagged as needing triage', watchlistNeedsTriage({ ...row('Heavy metals Pb Hg Cd As'), productStatus: M }));
t('a row whose status names a function is never triage', !watchlistNeedsTriage({ ...row('Heavy metals Pb Hg Cd As'), productStatus: 'Needs Safety Review' }));
t('Needs Safety Review beats an Owner of Regulatory', needs('Parabens', 'Needs Safety Review') === 'safety');
t('Needs Regulatory Review beats an Owner of Safety', needs('Arnica montana', 'Needs Regulatory Review') === 'regulatory');

const A = (group: string, verdict: string) => ({ ...row(group), reviewerAssessment: verdict });
t('a newly set Non-critical is an accepting act', newlyAcceptingActRows([row('Parabens')], [A('Parabens', 'Non-critical')]).length === 1);
t('a newly set Not a true match (closure) is too', newlyAcceptingActRows([row('Parabens')], [A('Parabens', 'Not a true match')]).length === 1);
t('Further information required alone is NOT an accepting act', newlyAcceptingActRows([row('Parabens')], [A('Parabens', 'Further information required')]).length === 0);
t('Critical (raising a finding) is not one either', newlyAcceptingActRows([row('Parabens')], [A('Parabens', 'Critical')]).length === 0);
t('ticking "safe to carry" is an accepting act', newlyAcceptingActRows([A('Parabens', 'Further information required')], [{ ...A('Parabens', 'Further information required'), carriedConclusion: true }]).length === 1);
t('an unchanged accepted verdict is not a new act', newlyAcceptingActRows([A('Parabens', 'Non-critical')], [A('Parabens', 'Non-critical')]).length === 0);
t('changing Critical to Non-critical is a new act', newlyAcceptingActRows([A('Parabens', 'Critical')], [A('Parabens', 'Non-critical')]).length === 1);
const D = (group: string, d: string, extra: Record<string, unknown> = {}) => ({ ...row(group), gate4Disposition: d, ...extra });
t('a clearing classification on a matched row is an accepting act', newlyAcceptingActRows([D('Parabens', '', { formulaMatchCount: 1 })], [D('Parabens', 'No issue identified', { formulaMatchCount: 1 })]).length === 1);
t('Considered — not selected on a matched row is too', newlyAcceptingActRows([D('Parabens', '', { formulaMatchCount: 1 })], [D('Parabens', 'Considered — not selected', { formulaMatchCount: 1 })]).length === 1);
t('...but on a row with no match it records a non-event', newlyAcceptingActRows([D('Parabens', '')], [D('Parabens', 'No issue identified')]).length === 0);
t('a non-clearing classification is not an act', newlyAcceptingActRows([D('Parabens', '', { formulaMatchCount: 1 })], [D('Parabens', 'Needs Safety Review', { formulaMatchCount: 1 })]).length === 0);

const inScope = (group: string, gate: string) => watchlistRowInScope(row(group), gate);
t('a Gate 4 row is in scope at Gate 4 and later', inScope('Parabens', 'SG04') && inScope('Parabens', 'SG07'));
t('a Gate 7 row is not in scope at Gate 4', !inScope('Essential oils', 'SG04') && !inScope('Retinol Retinyl Palmitate Tretinoin', 'SG04'));
t('...but is from Gate 7 on', inScope('Essential oils', 'SG07') && inScope('Essential oils', 'SG10'));
t('a Gate 6 row is out at Gate 4, in at Gate 6', !inScope('Bisphenol S', 'SG04') && inScope('Bisphenol S', 'SG06'));
t('no gate given -> every row', inScope('Essential oils', ''));
t('an unreadable Linked gate is in scope everywhere', watchlistRowInScope({ ingredientGroup: 'x' }, 'SG04'));

const flagged = (group: string, reviewer: string) => ({ ...row(group), productStatus: 'Needs Safety Review', reviewer });
t('a Reviewer newly named on a flagged row is checked', newlyNamedReviewerRows([row('BHT')], [flagged('BHT', 'Chi Chu')]).length === 1);
t('an unchanged Reviewer is not', newlyNamedReviewerRows([flagged('BHT', 'Chi Chu')], [flagged('BHT', 'Chi Chu')]).length === 0);
t('a Reviewer on a row that is not flagged is not checked', newlyNamedReviewerRows([row('BHT')], [{ ...row('BHT'), reviewer: 'Chi Chu' }]).length === 0);
t('clearing the Reviewer is not checked', newlyNamedReviewerRows([flagged('BHT', 'Chi Chu')], [flagged('BHT', '')]).length === 0);
t('a second reviewer newly named is checked too', newlyNamedReviewerRows([flagged('BHT', 'Chi Chu')], [{ ...flagged('BHT', 'Chi Chu'), secondReviewer: 'An Le' }]).length === 1);

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
