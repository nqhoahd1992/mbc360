// Round 5 question 4: both watch-lists flag a formula match by themselves, keep the matching result apart from the reviewer's classification
// (with the formula and list version and the match basis), and mark a conclusion for reassessment when the basis changes. Pure functions over
// a hand-built project on the real rule engine. Run: npm run verify:watchlist-reassessment
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { createEmptyRegisterRow, getRegisterConfig } from '../src/config/registers';
import { gateReadinessChecklist } from '../src/utils/gateProgress';
import { WATCH_LIST_VERSION, watchlistMatchLines } from '../src/utils/ingredientWatch';
import { deriveRegisterRows, snapshotWatchlistBasis, watchlistConclusionStale } from '../src/utils/registerDerived';
import type { ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const PROHIBITED = 'prohibitedIngredients';
const CAUTION = 'pbCautionLimits';
const line = (n: number, inciName: string, percent = 1) => ({ line: n, rmCode: `RM-${n}`, inciName, percent, supplier: 'x' }) as never;

const base = (): ProjectData => {
  const p = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
  p.formulaVersion = 'F1.0';
  return p;
};
const row = (p: ProjectData, key: string, group: string) => (p.registers[key] ?? []).find((r) => r.ingredientGroup === group)!;
const derived = (p: ProjectData, key: string, group: string) => deriveRegisterRows(key, p.registers[key] ?? [], p).find((r) => r.ingredientGroup === group)!;

// --- the Pregnancy / Breastfeeding Caution list now flags a match by itself, as the Prohibited list does ----------------------------------
{
  const p = base();
  const none = derived(p, CAUTION, 'Kojic acid');
  t('a caution row with no match keeps the status it ships with', none.productStatus === 'Not assessed' && none.formulaMatchCount === 0);
  p.bom = [line(1, 'Kojic Acid Dipalmitate')];
  const hit = derived(p, CAUTION, 'Kojic acid');
  t('a matching Formula BOM line sets the status to REVIEW - possible formula match', hit.productStatus === 'REVIEW - possible formula match' && hit.formulaMatchCount === 1);
  p.registers[CAUTION] = (p.registers[CAUTION] ?? []).map((r) => (r.ingredientGroup === 'Kojic acid' ? { ...r, productStatus: 'Within limit - evidence linked' } : r));
  t('...a status a person chose is kept', derived(p, CAUTION, 'Kojic acid').productStatus === 'Within limit - evidence linked');
  p.registers[CAUTION] = (p.registers[CAUTION] ?? []).map((r) => (r.ingredientGroup === 'Kojic acid' ? { ...r, productStatus: 'REVIEW - possible formula match' } : r));
  p.bom = [];
  t('...and the status goes back when the match goes away', derived(p, CAUTION, 'Kojic acid').productStatus === 'Not assessed');
  t('REVIEW is a choice of the caution list', (getRegisterConfig(CAUTION)!.columns.find((c) => c.key === 'productStatus')!.options ?? []).includes('REVIEW - possible formula match'));
}

// --- the matching result is kept apart, with formula and list version and the basis ----------------------------------------------------
{
  const p = base();
  p.bom = [line(1, 'Methylparaben'), line(2, 'Propylparaben')];
  const d = derived(p, PROHIBITED, 'Parabens');
  t('the match basis names every matching ingredient', String(d.matchBasis).includes('Methylparaben') && String(d.matchBasis).includes('Propylparaben'), String(d.matchBasis));
  t('...and says what it matched on', String(d.matchBasis).includes('name "paraben"'));
  t('the row says which formula version and list version it was matched against', d.matchedAgainst === `Formula F1.0 · list ${WATCH_LIST_VERSION}`, String(d.matchedAgainst));
  t('a row with no match says so', derived(p, PROHIBITED, 'Triclosan').matchBasis === 'No match');
  const before = watchlistMatchLines(p, 'prohibited', 'Parabens').join('|');
  p.bom = [line(2, 'Propylparaben', 5), line(1, 'Methylparaben', 9)];
  t('percentages and the order of the lines are NOT part of the basis', watchlistMatchLines(p, 'prohibited', 'Parabens').join('|') === before);
}

// --- a classification is reached on a basis; a changed basis marks it for reassessment --------------------------------------------------
{
  const p = base();
  p.bom = [line(1, 'Methylparaben')];
  const committed = p.registers[PROHIBITED] ?? [];
  const classify = (reviewDate: string, disposition = 'Needs Safety Review') =>
    (p.registers[PROHIBITED] ?? []).map((r) => (r.ingredientGroup === 'Parabens' ? { ...r, gate4Disposition: disposition, reviewDate } : r));
  let rows = snapshotWatchlistBasis(p, PROHIBITED, committed, classify('2026-11-01'));
  const snap = String(rows.find((r) => r.ingredientGroup === 'Parabens')!.basisAtReview);
  t('recording a classification snapshots the match it was reached on', snap.includes('Methylparaben'), snap);
  t('a row with no classification carries no basis', String(rows.find((r) => r.ingredientGroup === 'Triclosan')!.basisAtReview) === '');
  p.registers[PROHIBITED] = rows;
  t('nothing is stale while the match is the same', !watchlistConclusionStale(p, PROHIBITED, row(p, PROHIBITED, 'Parabens')));

  // a trial refinement that only moves a percentage does not reopen anything
  p.bom = [line(1, 'Methylparaben', 40)];
  t('a percentage change does not mark the conclusion for reassessment', !watchlistConclusionStale(p, PROHIBITED, row(p, PROHIBITED, 'Parabens')));

  // a new material that matches does
  p.bom = [line(1, 'Methylparaben'), line(2, 'Butylparaben')];
  t('a new matching material marks it for reassessment, though a status was already chosen', watchlistConclusionStale(p, PROHIBITED, row(p, PROHIBITED, 'Parabens')));
  t('...and the derived column says Yes', derived(p, PROHIBITED, 'Parabens').reassessmentNeeded === 'Yes');
  // the match going away changes the basis too
  p.bom = [];
  t('a match that goes away also marks it for reassessment', watchlistConclusionStale(p, PROHIBITED, row(p, PROHIBITED, 'Parabens')));

  // the reviewer reassesses: records the review date again
  p.bom = [line(1, 'Methylparaben'), line(2, 'Butylparaben')];
  rows = snapshotWatchlistBasis(p, PROHIBITED, p.registers[PROHIBITED] ?? [], (p.registers[PROHIBITED] ?? []).map((r) => (r.ingredientGroup === 'Parabens' ? { ...r, reviewDate: '2026-11-10' } : r)));
  p.registers[PROHIBITED] = rows;
  t('recording the review date again takes the new basis, and the row is no longer stale', !watchlistConclusionStale(p, PROHIBITED, row(p, PROHIBITED, 'Parabens')));
  // saving an unrelated cell does not clear it
  p.bom = [line(1, 'Methylparaben'), line(2, 'Butylparaben'), line(3, 'Isobutylparaben')];
  const same = snapshotWatchlistBasis(p, PROHIBITED, p.registers[PROHIBITED] ?? [], (p.registers[PROHIBITED] ?? []).map((r) => (r.ingredientGroup === 'Parabens' ? { ...r, reviewRationale: 'edited' } : r)));
  p.registers[PROHIBITED] = same;
  t('saving an unrelated cell does not make a stale conclusion current', watchlistConclusionStale(p, PROHIBITED, row(p, PROHIBITED, 'Parabens')));
  // the client cannot forge the basis
  const forged = snapshotWatchlistBasis(p, PROHIBITED, p.registers[PROHIBITED] ?? [], (p.registers[PROHIBITED] ?? []).map((r) => (r.ingredientGroup === 'Parabens' ? { ...r, basisAtReview: 'forged' } : r)));
  t('a basis sent by the client is discarded', String(forged.find((r) => r.ingredientGroup === 'Parabens')!.basisAtReview) !== 'forged');
}

// --- what blocks, and where ----------------------------------------------------------------------------------------------------------------
{
  // Gate 4: every row dispositioned. A fully dispositioned list stops being so when a classification goes stale.
  const p = base();
  p.bom = [line(1, 'Methylparaben')];
  const all = (p.registers[PROHIBITED] ?? []).map((r) => ({ ...r, gate4Disposition: 'No issue identified', reviewDate: '2026-11-01' }));
  p.registers[PROHIBITED] = snapshotWatchlistBasis(p, PROHIBITED, p.registers[PROHIBITED] ?? [], all);
  const item = (id: string, gate = 'SG04') => gateReadinessChecklist(p, gate).find((i) => i.id === id)!;
  t('Gate 4: with every row classified on the current match, the watch-list item is met', item('sg04-watchlist-dispositioned').satisfied);
  p.bom = [line(1, 'Methylparaben'), line(2, 'Butylparaben')];
  t('...a new matching material makes it unmet again (a passed Gate 4 reopens)', !item('sg04-watchlist-dispositioned').satisfied);
  p.bom = [line(1, 'Methylparaben', 30)];
  t('...a trial refinement that moves only a percentage does not', item('sg04-watchlist-dispositioned').satisfied);

  // Gate 7 closes the issue for the final formula.
  const q = base();
  q.bom = [line(1, 'Methylparaben')];
  const classified = (q.registers[PROHIBITED] ?? []).map((r) => ({
    ...r,
    gate4Disposition: 'No issue identified',
    reviewDate: '2026-11-01',
    productStatus: r.ingredientGroup === 'Parabens' ? 'Not present - evidence linked' : r.productStatus,
  }));
  q.registers[PROHIBITED] = snapshotWatchlistBasis(q, PROHIBITED, q.registers[PROHIBITED] ?? [], classified);
  // The API derives these columns on every read (project-mapper); the test does the same before asking the engine.
  const withDerived = (p2: ProjectData): ProjectData => ({ ...p2, registers: { ...p2.registers, [PROHIBITED]: deriveRegisterRows(PROHIBITED, p2.registers[PROHIBITED] ?? [], p2) } });
  const g7 = (p2: ProjectData) => gateReadinessChecklist(withDerived(p2), 'SG07').find((i) => i.id === 'sg07-prohibited-closed')!;
  t('Gate 7: a closed prohibited screen is met', g7(q).satisfied);
  q.bom = [line(1, 'Methylparaben'), line(2, 'Butylparaben')];
  t('...and not met once the basis has changed since the conclusion', !g7(q).satisfied);
}

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
