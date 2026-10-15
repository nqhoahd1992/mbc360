// Verifies which authority a flagged watch-list row needs from whoever carries it under Proceed with Conditions (SW-32):
// a status that names a function decides it; otherwise the row's own Owner column does; a row whose Owner names both
// or neither is satisfied by either. Run on the REAL seeded rows of both registers.
// Run: npm run verify:watchlist-authority
import { REGISTER_CONFIGS } from '../src/config/registers';
import { newlyCarriedVerdictRows, newlyNamedReviewerRows, watchlistRowInScope, watchlistRequiredAuthority } from '../src/utils/watchlistReview';

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
t('machine match, Owner Regulatory / Safety -> either', needs('Retinol Retinyl Palmitate Tretinoin', M) === 'safety+regulatory');
t('machine match, Owner Safety / Regulatory -> either', needs('BHT', M) === 'safety+regulatory');
t('machine match, Owner Quality (names neither) -> either', needs('Heavy metals Pb Hg Cd As', M) === 'safety+regulatory');
t('Needs Safety Review beats an Owner of Regulatory', needs('Parabens', 'Needs Safety Review') === 'safety');
t('Needs Regulatory Review beats an Owner of Safety', needs('Arnica montana', 'Needs Regulatory Review') === 'regulatory');

const A = (group: string, verdict: string) => ({ ...row(group), reviewerAssessment: verdict });
t('a newly set Non-critical is a carried verdict', newlyCarriedVerdictRows([row('Parabens')], [A('Parabens', 'Non-critical')]).length === 1);
t('a newly set Further information required is too', newlyCarriedVerdictRows([row('Parabens')], [A('Parabens', 'Further information required')]).length === 1);
t('Critical and Not a true match are not', newlyCarriedVerdictRows([row('Parabens'), row('BHT')], [A('Parabens', 'Critical'), A('BHT', 'Not a true match')]).length === 0);
t('an unchanged carried verdict is not a new act', newlyCarriedVerdictRows([A('Parabens', 'Non-critical')], [A('Parabens', 'Non-critical')]).length === 0);
t('changing Critical to Non-critical is a new act', newlyCarriedVerdictRows([A('Parabens', 'Critical')], [A('Parabens', 'Non-critical')]).length === 1);

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

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
